import { adminRepository } from "../repositories/admin.repository.js";
import { safetyReportService } from "./safetyReport.service.js";
import { serializeUser } from "../utils/serializers.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";

export const adminService = {
  async listUsers() {
    const users = await adminRepository.findUsers();
    return users.map(serializeUser);
  },
  listRides: () => adminRepository.findRides(),
  listBookings: () => adminRepository.findBookings(),
  listPayments: () => adminRepository.findPayments(),
  listReports: () => safetyReportService.listAll(),

  async setUserStatus(adminId, userId, isActive) {
    const user = await adminRepository.updateUserStatus(userId, isActive);
    await audit(null, { userId: adminId, action: "ADMIN_USER_STATUS_UPDATED", entityType: "User", entityId: userId, metadata: { isActive } });
    return serializeUser(user);
  },

  async verifyVehicle(adminId, vehicleId, verificationStatus) {
    const vehicle = await adminRepository.verifyVehicle(vehicleId, verificationStatus);
    await audit(null, { userId: adminId, action: "ADMIN_VEHICLE_VERIFIED", entityType: "Vehicle", entityId: vehicleId, metadata: { verificationStatus } });
    return vehicle;
  },

  updateReport: (adminId, reportId, data) => safetyReportService.updateStatus(adminId, reportId, data),
};
