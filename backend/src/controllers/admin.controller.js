import { adminService } from "../services/admin.service.js";
import { ok } from "../utils/apiResponse.js";

export const adminController = {
  async listUsers(_req, res) {
    ok(res, await adminService.listUsers());
  },
  async listRides(_req, res) {
    ok(res, await adminService.listRides());
  },
  async listBookings(_req, res) {
    ok(res, await adminService.listBookings());
  },
  async listPayments(_req, res) {
    ok(res, await adminService.listPayments());
  },
  async listReports(_req, res) {
    ok(res, await adminService.listReports());
  },
  async setUserStatus(req, res) {
    const user = await adminService.setUserStatus(req.user.id, req.params.id, req.body.isActive);
    ok(res, user, "User status updated");
  },
  async verifyVehicle(req, res) {
    const vehicle = await adminService.verifyVehicle(req.user.id, req.params.id, req.body.verificationStatus);
    ok(res, vehicle, "Vehicle verification updated");
  },
  async updateReport(req, res) {
    const report = await adminService.updateReport(req.user.id, req.params.id, req.body);
    ok(res, report, "Safety report updated");
  },
};
