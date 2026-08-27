import { api } from "./api.js";

export const adminService = {
  listUsers: () => api.get("/admin/users").then((res) => res.data),
  listRides: () => api.get("/admin/rides").then((res) => res.data),
  listBookings: () => api.get("/admin/bookings").then((res) => res.data),
  listPayments: () => api.get("/admin/payments").then((res) => res.data),
  listReports: () => api.get("/admin/reports").then((res) => res.data),
  setUserStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }).then((res) => res.data),
  verifyVehicle: (id, verificationStatus) =>
    api.put(`/admin/vehicles/${id}/verify`, { verificationStatus }).then((res) => res.data),
  updateReport: (id, payload) => api.put(`/admin/reports/${id}`, payload).then((res) => res.data),
};
