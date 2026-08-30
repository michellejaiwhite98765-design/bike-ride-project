import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeRegistrationNumber } from "../utils/vehicle.utils.js";
import { audit } from "../utils/audit.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { way2ApiService } from "./way2api.service.js";
import { rcOcrService } from "./rcOcr.service.js";

async function assertOwner(vehicleId, userId) {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  if (vehicle.ownerId !== userId) throw ApiError.forbidden("You do not own this vehicle");
  return vehicle;
}

function rcNumbersEquivalent(expected, extracted) {
  const a = normalizeRegistrationNumber(expected);
  const b = normalizeRegistrationNumber(extracted);
  if (!a || !b || a.length !== b.length) return false;
  const ambiguous = new Map([
    ["O", new Set(["O", "0"])], ["0", new Set(["0", "O"])],
    ["I", new Set(["I", "1"])], ["1", new Set(["1", "I"])],
    ["Z", new Set(["Z", "2"])], ["2", new Set(["2", "Z"])],
    ["S", new Set(["S", "5"])], ["5", new Set(["5", "S"])],
    ["B", new Set(["B", "8"])], ["8", new Set(["8", "B"])]
  ]);
  return [...a].every((char, index) => char === b[index] || ambiguous.get(char)?.has(b[index]));
}

export const vehicleService = {
  async create(userId, data) {
    const existing = await vehicleRepository.findAnyByRegistrationNumber(data.registrationNumber);

    if (existing) {
      if (existing.ownerId !== userId) {
        throw ApiError.conflict("This registration number is already registered to another account");
      }
      if (existing.isActive) {
        throw ApiError.conflict("You have already added this vehicle");
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

    const ocr = await rcOcrService.extractRegistrationNumber(file);
    const expected = normalizeRegistrationNumber(vehicle.registrationNumber);

    if (!ocr.registrationNumber) {
      await vehicleRepository.update(vehicleId, {
        rcOcrStatus: "FAILED",
        rcExtractedRegistrationNumber: null,
        verificationStatus: "REJECTED",
        verificationFailureReason: "Could not read a vehicle registration number from the uploaded RC. Please upload a clear RC image or PDF.",
      });
      throw ApiError.badRequest("Could not read the registration number from the RC. Please upload a clear document.");
    }

    if (!rcNumbersEquivalent(expected, ocr.registrationNumber)) {
      await vehicleRepository.update(vehicleId, {
        rcOcrStatus: "MISMATCH",
        rcExtractedRegistrationNumber: ocr.registrationNumber,
        verificationStatus: "REJECTED",
        verificationFailureReason: `RC registration number ${ocr.registrationNumber} does not match vehicle ${expected}`,
      });
      throw ApiError.badRequest(`Wrong RC uploaded. The RC belongs to ${ocr.registrationNumber}, not ${expected}.`);
    }

    const uploaded = await cloudinaryService.uploadRcDocument(file, vehicleId);
    const updated = await vehicleRepository.update(vehicleId, {
      rcDocumentUrl: uploaded.secureUrl,
      rcDocumentPublicId: uploaded.publicId,
      verificationStatus: "PENDING",
      verificationFailureReason: null,
      rcExtractedRegistrationNumber: ocr.registrationNumber,
      rcOcrStatus: "MATCHED",
      updatedAt: new Date(),
    });

    await audit(null, { userId, action: "VEHICLE_RC_DOCUMENT_UPLOADED", entityType: "Vehicle", entityId: vehicleId, metadata: { rcOcrStatus: "MATCHED" } });
    return updated;
  },

  async verify(userId, vehicleId) {
    const vehicle = await assertOwner(vehicleId, userId);

    if (!vehicle.rcDocumentUrl || vehicle.rcOcrStatus !== "MATCHED") {
      throw ApiError.badRequest("Please upload an RC that matches the vehicle registration number before verifying");
    }

    if (!rcNumbersEquivalent(vehicle.registrationNumber, vehicle.rcExtractedRegistrationNumber)) {
      throw ApiError.badRequest("The uploaded RC does not match this vehicle registration number");
    }

    if (vehicle.verificationStatus === "VERIFIED" && vehicle.verificationData) {
      return { vehicle, cached: true, providerResult: vehicle.verificationData };
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
