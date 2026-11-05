import { drivingLicenceRepository } from "../repositories/drivingLicence.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { normalizeRegistrationNumber } from "../utils/vehicle.utils.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { rcOcrService } from "./rcOcr.service.js";
import { way2ApiService } from "./way2api.service.js";
import { logger } from "../config/logger.js";

const TAKEN_MESSAGE = "This driving licence is already verified on another account. If it is yours, please contact support.";

const isExpired = (licence) => Boolean(licence?.expiryDate) && new Date(licence.expiryDate).getTime() < startOfToday();
function startOfToday() {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** What the app shows; never the stored document link. */
function serialize(licence) {
  if (!licence) return { status: "NOT_SUBMITTED" };
  const status = licence.status === "VERIFIED" && isExpired(licence) ? "EXPIRED" : licence.status;
  return {
    status,
    licenceNumber: licence.licenceNumber,
    holderName: licence.holderName,
    expiryDate: licence.expiryDate ? new Date(licence.expiryDate).toISOString().slice(0, 10) : null,
    dateOfBirth: licence.dateOfBirth ? new Date(licence.dateOfBirth).toISOString().slice(0, 10) : null,
    verifiedBy: licence.verificationProvider || null,
    failureReason: licence.failureReason,
    verifiedAt: licence.verifiedAt,
    updatedAt: licence.updatedAt,
  };
}

export const drivingLicenceService = {
  async get(userId) {
    return serialize(await drivingLicenceRepository.findByUser(userId));
  },

  /**
   * Saves the licence and checks the uploaded document: the typed licence
   * number must appear on it (OCR, same engine as the vehicle RC). A match
   * verifies it straight away; otherwise it is saved as REJECTED with why.
   */
  async submit(userId, { licenceNumber: rawNumber, holderName, expiryDate, dateOfBirth }, file) {
    const licenceNumber = normalizeRegistrationNumber(rawNumber);
    if (new Date(`${expiryDate}T00:00:00.000Z`).getTime() < startOfToday()) {
      throw ApiError.badRequest("This driving licence has expired. Please renew it first.");
    }
    if (await drivingLicenceRepository.findVerifiedByNumber(licenceNumber, userId)) throw ApiError.conflict(TAKEN_MESSAGE);

    const base = { licenceNumber, holderName, expiryDate };

    // Government registry check (Way2API) when configured; the OCR check below
    // is the fallback when it isn't, or when the provider itself is down.
    if (way2ApiService.isConfigured()) {
      if (!dateOfBirth) throw ApiError.badRequest("Enter your date of birth as on the licence.");
      const check = await way2ApiService.verifyDrivingLicence({ licenceNumber, dob: dateOfBirth });
      const provider = { dateOfBirth, verificationProvider: "WAY2API", providerOrderId: check.orderId };

      if (check.status === "VERIFIED") {
        const r = check.result;
        const doe = /^\d{4}-\d{2}-\d{2}$/.test(r.doe || "") && !r.doe.startsWith("1800") ? r.doe : expiryDate;
        if (new Date(`${doe}T00:00:00.000Z`).getTime() < startOfToday()) {
          await drivingLicenceRepository.upsert(userId, {
            ...base, ...provider, expiryDate: doe, holderName: r.name, status: "REJECTED",
            failureReason: `Government records show this licence expired on ${doe}. Please renew it first.`,
          });
          throw ApiError.badRequest(`This driving licence expired on ${doe} as per government records. Please renew it first.`);
        }
        return this.saveVerified(userId, file, {
          ...base, ...provider, holderName: r.name, expiryDate: doe, vehicleClasses: r.vehicle_classes || null,
        });
      }

      if (check.status === "NOT_FOUND" || check.status === "UNVERIFIED") {
        await drivingLicenceRepository.upsert(userId, {
          ...base, ...provider, status: "REJECTED",
          failureReason: `No driving licence ${licenceNumber} with this date of birth was found in government records. Check both and try again.`,
        });
        await audit(null, { userId, action: "LICENCE_REJECTED", entityType: "DrivingLicence", entityId: userId, metadata: { provider: "WAY2API" } });
        throw ApiError.badRequest("No licence with this number and date of birth was found in government records. Check both and try again.");
      }

      logger.warn(`Way2API licence check unavailable (${check.status}: ${check.message}) - falling back to OCR for user ${userId}`);
    }

    const { found } = await rcOcrService.documentContainsNumber(file, licenceNumber, "Licence");
    if (!found) {
      await drivingLicenceRepository.upsert(userId, {
        ...base,
        status: "REJECTED",
        failureReason: `Licence number ${licenceNumber} could not be found on the uploaded document. Upload a clear photo of the front of your licence.`,
      });
      await audit(null, { userId, action: "LICENCE_REJECTED", entityType: "DrivingLicence", entityId: userId });
      throw ApiError.badRequest("We couldn't find this licence number on the uploaded document. Check the number and upload a clear photo of the front of your licence.");
    }

    return this.saveVerified(userId, file, { ...base, dateOfBirth: dateOfBirth || null, verificationProvider: "OCR", ocrExtractedNumber: licenceNumber });
  },

  /** Stores the document (if Cloudinary is set up) and marks the licence VERIFIED. */
  async saveVerified(userId, file, data) {
    let uploaded = { secureUrl: null, publicId: null };
    if (cloudinaryService.isConfigured()) {
      uploaded = await cloudinaryService.uploadDocument(file, `licence/${userId}`);
    } else {
      logger.warn(`Cloudinary not configured - licence for user ${userId} verified without storing the document`);
    }

    let saved;
    try {
      saved = await drivingLicenceRepository.upsert(userId, {
        ...data,
        status: "VERIFIED",
        failureReason: null,
        documentUrl: uploaded.secureUrl,
        documentPublicId: uploaded.publicId,
        verifiedAt: new Date(),
      });
    } catch (err) {
      // Verified on another account at the same moment (unique index).
      if (err.code === "23505") throw ApiError.conflict(TAKEN_MESSAGE);
      throw err;
    }
    await audit(null, { userId, action: "LICENCE_VERIFIED", entityType: "DrivingLicence", entityId: userId, metadata: { provider: data.verificationProvider } });
    return serialize(saved);
  },

  /**
   * Who can offer trips. A user with a vehicle is a rider; to create a trip
   * they also need a verified, unexpired licence and a verified vehicle.
   */
  async riderStatus(userId) {
    const [licence, vehicles] = await Promise.all([this.get(userId), vehicleRepository.findByOwner(userId)]);
    const licenceVerified = licence.status === "VERIFIED";
    const hasVerifiedVehicle = vehicles.some((v) => v.verificationStatus === "VERIFIED");
    const missing = [];
    if (!licenceVerified) missing.push("LICENCE");
    if (!hasVerifiedVehicle) missing.push("VEHICLE");
    return {
      isRider: vehicles.length > 0,
      licence,
      vehicleCount: vehicles.length,
      verifiedVehicleCount: vehicles.filter((v) => v.verificationStatus === "VERIFIED").length,
      canCreateTrip: missing.length === 0,
      missing,
    };
  },

  /** Throws unless the user's licence is verified and not expired. */
  async assertVerified(userId) {
    const licence = await this.get(userId);
    if (licence.status === "EXPIRED") throw ApiError.forbidden("Your driving licence has expired. Please upload your renewed licence before creating a trip.");
    if (licence.status !== "VERIFIED") throw ApiError.forbidden("Please verify your driving licence before creating a trip.");
  },
};
