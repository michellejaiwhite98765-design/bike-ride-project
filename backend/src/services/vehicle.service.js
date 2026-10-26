import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeRegistrationNumber, registrationNumbersLookAlike } from "../utils/vehicle.utils.js";
import { audit } from "../utils/audit.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { way2ApiService } from "./way2api.service.js";
import { rcOcrService } from "./rcOcr.service.js";
import { logger } from "../config/logger.js";

async function assertOwner(vehicleId, userId) {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  if (vehicle.ownerId !== userId) throw ApiError.forbidden("You do not own this vehicle");
  return vehicle;
}

const TAKEN_MESSAGE =
  "This vehicle is already verified on another account. If it is yours, please contact support.";

/**
 * A registration number belongs to whoever proved it with a matching RC.
 * Another account's vehicle with this plate only blocks it when that
 * vehicle is active and VERIFIED. An unproven claim (saved at the details
 * step but never verified, e.g. the RC couldn't be read) or a removed
 * vehicle is released, so the plate can be added here.
 * Returns this user's own row for the plate, if any.
 */
async function claimRegistrationNumber(userId, registrationNumber) {
  const existing = await vehicleRepository.findAnyByRegistrationNumber(registrationNumber);
  if (!existing || existing.ownerId === userId) return existing;

  if (existing.isActive && existing.verificationStatus === "VERIFIED") throw ApiError.conflict(TAKEN_MESSAGE);
  const released = await vehicleRepository.releaseRegistrationNumber(
    existing.id,
    "Registration number was verified by another account"
  );
  // Verified by its owner in the meantime.
  if (!released) throw ApiError.conflict(TAKEN_MESSAGE);
  await audit(null, { userId, action: "VEHICLE_PLATE_RELEASED", entityType: "Vehicle", entityId: existing.id, metadata: { previousOwnerId: existing.ownerId } });
  return null;
}

export const vehicleService = {
  async create(userId, data) {
    const existing = await claimRegistrationNumber(userId, data.registrationNumber);

    if (existing) {
      if (existing.isActive && existing.verificationStatus === "VERIFIED") {
        throw ApiError.conflict("You have already added this vehicle");
      }
      if (existing.isActive) {
        // Added before but never verified (e.g. the RC upload failed): carry
        // on with the same vehicle instead of refusing.
        const resumed = await vehicleRepository.update(existing.id, {
          vehicleType: data.vehicleType,
          color: data.color,
          brand: data.brand,
          model: data.model,
          manufacturingYear: data.manufacturingYear,
          ...(data.seatCapacity !== undefined ? { seatCapacity: data.seatCapacity } : {}),
        });
        await audit(null, { userId, action: "VEHICLE_UPDATED", entityType: "Vehicle", entityId: resumed.id });
        return resumed;
      }

      // Same owner, previously removed vehicle with this plate: reactivate
      // the existing row instead of trying to insert a duplicate, which
      // would otherwise fail the DB's unique constraint on
      // registration_number (that constraint applies regardless of
      // is_active, so soft-deleted rows still occupy the plate).
      const reactivated = await vehicleRepository.update(existing.id, {
        vehicleType: data.vehicleType,
        color: data.color,
        brand: data.brand,
        model: data.model,
        manufacturingYear: data.manufacturingYear,
        isActive: true,
        verificationStatus: "PENDING",
        verificationProvider: null,
        verificationOrderId: null,
        verificationData: null,
        verificationCheckedAt: null,
        verificationFailureReason: null,
        verifiedAt: null,
        rcExtractedRegistrationNumber: null,
        rcOcrStatus: "NOT_STARTED",
        rcDocumentUrl: null,
        rcDocumentPublicId: null,
      });
      await audit(null, { userId, action: "VEHICLE_REACTIVATED", entityType: "Vehicle", entityId: reactivated.id });
      return reactivated;
    }

    const vehicle = await vehicleRepository.create(userId, data);
    await audit(null, { userId, action: "VEHICLE_CREATED", entityType: "Vehicle", entityId: vehicle.id });
    return vehicle;
  },

  listMine(userId) {
    return vehicleRepository.findByOwner(userId);
  },

  async getById(userId, vehicleId) {
    return assertOwner(vehicleId, userId);
  },

  async update(userId, vehicleId, data) {
    const existing = await assertOwner(vehicleId, userId);
    // Owners cannot directly set verification status.
    delete data.verificationStatus;

    const verificationRelevantFields = ["registrationNumber", "brand", "model", "manufacturingYear"];
    const changedVerificationInput = verificationRelevantFields.some(
      (field) => data[field] !== undefined && String(data[field]) !== String(existing[field])
    );

    if (
      data.registrationNumber !== undefined &&
      normalizeRegistrationNumber(data.registrationNumber) !== normalizeRegistrationNumber(existing.registrationNumber)
    ) {
      const own = await claimRegistrationNumber(userId, data.registrationNumber);
      if (own && own.id !== vehicleId) throw ApiError.conflict("You have already added a vehicle with this registration number");
    }

    if (changedVerificationInput) {
      const activeRideCount = await vehicleRepository.countActiveRides(vehicleId);
      if (activeRideCount > 0) {
        throw ApiError.conflict("Vehicle details cannot be changed while this vehicle is used by active or upcoming rides");
      }
      data.verificationStatus = "PENDING";
      data.verificationProvider = null;
      data.verificationOrderId = null;
      data.verificationData = null;
      data.verificationCheckedAt = null;
      data.verificationFailureReason = null;
      data.verifiedAt = null;
      data.rcExtractedRegistrationNumber = null;
      data.rcOcrStatus = "NOT_STARTED";
      data.rcDocumentUrl = null;
      data.rcDocumentPublicId = null;
    }
    const vehicle = await vehicleRepository.update(vehicleId, data);
    await audit(null, { userId, action: "VEHICLE_UPDATED", entityType: "Vehicle", entityId: vehicleId });
    return vehicle;
  },

  async uploadRcDocument(userId, vehicleId, file) {
    const vehicle = await assertOwner(vehicleId, userId);

    const expected = normalizeRegistrationNumber(vehicle.registrationNumber);
    const ocr = await rcOcrService.extractRegistrationNumber(file, expected);

    if (!ocr.registrationNumber) {
      await vehicleRepository.update(vehicleId, {
        rcOcrStatus: "FAILED",
        rcExtractedRegistrationNumber: null,
        verificationStatus: "REJECTED",
        verificationFailureReason: "Could not read a vehicle registration number from the uploaded RC. Please upload a clear RC image or PDF.",
      });
      throw ApiError.badRequest("Could not read the registration number from the RC. Please upload a clear document.");
    }

    if (!registrationNumbersLookAlike(expected, ocr.registrationNumber)) {
      await vehicleRepository.update(vehicleId, {
        rcOcrStatus: "MISMATCH",
        rcExtractedRegistrationNumber: ocr.registrationNumber,
        verificationStatus: "REJECTED",
        verificationFailureReason: `RC registration number ${ocr.registrationNumber} does not match vehicle ${expected}`,
      });
      throw ApiError.badRequest(`Wrong RC uploaded. The RC belongs to ${ocr.registrationNumber}, not ${expected}.`);
    }

    // Keep a copy of the RC in Cloudinary when it's set up. Without it (e.g. a
    // fresh free deployment) the number check above still decides the
    // result; only the stored copy of the document is skipped.
    let uploaded = { secureUrl: null, publicId: null };
    if (cloudinaryService.isConfigured()) {
      uploaded = await cloudinaryService.uploadRcDocument(file, vehicleId);
    } else {
      logger.warn(`Cloudinary not configured - RC for vehicle ${vehicleId} verified without storing the document`);
    }
    // WAY2API registry verification is skipped for now (no provider configured) —
    // auto-verify as soon as the RC's OCR'd registration number matches the vehicle.
    const updated = await vehicleRepository.update(vehicleId, {
      rcDocumentUrl: uploaded.secureUrl,
      rcDocumentPublicId: uploaded.publicId,
      verificationStatus: "VERIFIED",
      verificationProvider: "AUTO_SKIP",
      verificationFailureReason: null,
      verifiedAt: new Date(),
      rcExtractedRegistrationNumber: ocr.registrationNumber,
      rcOcrStatus: "MATCHED",
      updatedAt: new Date(),
    });

    await audit(null, { userId, action: "VEHICLE_RC_DOCUMENT_UPLOADED", entityType: "Vehicle", entityId: vehicleId, metadata: { rcOcrStatus: "MATCHED" } });
    await audit(null, { userId, action: "VEHICLE_VERIFIED", entityType: "Vehicle", entityId: vehicleId, metadata: { provider: "AUTO_SKIP" } });
    return updated;
  },

  async verify(userId, vehicleId) {
    const vehicle = await assertOwner(vehicleId, userId);

    // Check this before the RC-document preconditions below: a vehicle can
    // already be VERIFIED without those fields set (e.g. an admin override
    // via PUT /admin/vehicles/:id/verify), and re-verifying it should just
    // return the cached result instead of complaining about a missing RC.
    if (vehicle.verificationStatus === "VERIFIED") {
      return { vehicle, cached: true, providerResult: vehicle.verificationData };
    }

    if (!vehicle.rcDocumentUrl || vehicle.rcOcrStatus !== "MATCHED") {
      throw ApiError.badRequest("Please upload an RC that matches the vehicle registration number before verifying");
    }

    if (!registrationNumbersLookAlike(vehicle.registrationNumber, vehicle.rcExtractedRegistrationNumber)) {
      throw ApiError.badRequest("The uploaded RC does not match this vehicle registration number");
    }

    const existingRegistration = await vehicleRepository.findByRegistrationNumber(vehicle.registrationNumber);
    if (existingRegistration && existingRegistration.id !== vehicleId && existingRegistration.verificationStatus === "VERIFIED") {
      throw ApiError.conflict("This registration number is already attached to another verified vehicle");
    }

    try {
      const verification = await way2ApiService.verifyRc({ registrationNumber: vehicle.registrationNumber });
      if (verification.status !== "VERIFIED" || !verification.result) {
        throw Object.assign(new Error(verification.message || "Vehicle could not be verified"), {
          way2Api: { order_id: verification.orderId, data: { result: verification.result }, status: verification.status },
        });
      }

      const result = verification.result;
      const updated = await vehicleRepository.update(vehicleId, {
        verificationStatus: "VERIFIED",
        verificationProvider: "WAY2API",
        verificationOrderId: verification.orderId,
        verificationData: result,
        verificationCheckedAt: new Date(),
        verificationFailureReason: null,
        verifiedAt: new Date(),
      });

      await audit(null, { userId, action: "VEHICLE_VERIFIED", entityType: "Vehicle", entityId: vehicleId });
      return { vehicle: updated, cached: false, providerResult: result };
    } catch (error) {
      const providerPayload = error.way2Api || null;
      const providerStatus = providerPayload?.status;
      const retryable = ["TIMEOUT", "PROVIDER_ERROR", "PROVIDER_AUTH_ERROR", "RATE_LIMITED"].includes(providerStatus);
      const updated = await vehicleRepository.update(vehicleId, {
        verificationStatus: retryable ? "PENDING" : "REJECTED",
        verificationProvider: "WAY2API",
        verificationOrderId: providerPayload?.order_id || null,
        verificationData: providerPayload?.data?.result || null,
        verificationCheckedAt: new Date(),
        verificationFailureReason: error.message,
        verifiedAt: null,
      });

      await audit(null, { userId, action: "VEHICLE_VERIFICATION_FAILED", entityType: "Vehicle", entityId: vehicleId });
      return { vehicle: updated, cached: false, providerResult: providerPayload?.data?.result || null, rejected: !retryable, retryable };
    }
  },

  async remove(userId, vehicleId) {
    await assertOwner(vehicleId, userId);
    const activeRideCount = await vehicleRepository.countActiveRides(vehicleId);
    if (activeRideCount > 0) {
      throw ApiError.conflict("Cannot delete a vehicle with active or upcoming rides");
    }
    await vehicleRepository.update(vehicleId, { isActive: false });
    await audit(null, { userId, action: "VEHICLE_DELETED", entityType: "Vehicle", entityId: vehicleId });
  },
};
