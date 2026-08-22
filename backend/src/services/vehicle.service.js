import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";

async function assertOwner(vehicleId, userId) {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  if (vehicle.ownerId !== userId) throw ApiError.forbidden("You do not own this vehicle");
  return vehicle;
}

export const vehicleService = {
  async create(userId, data) {
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
    await assertOwner(vehicleId, userId);
    // Verification is an admin-controlled field; owners cannot self-verify.
    delete data.verificationStatus;
    const vehicle = await vehicleRepository.update(vehicleId, data);
    await audit(null, { userId, action: "VEHICLE_UPDATED", entityType: "Vehicle", entityId: vehicleId });
    return vehicle;
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
