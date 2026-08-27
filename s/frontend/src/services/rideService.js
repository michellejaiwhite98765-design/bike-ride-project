import { api } from "./api.js";

export const rideService = {
  create(payload) {
    return api.post("/rides", payload).then((res) => res.data);
  },
  update(id, payload) {
    return api.put(`/rides/${id}`, payload).then((res) => res.data);
  },
  publish(id) {
    return api.post(`/rides/${id}/publish`).then((res) => res.data);
  },
  cancel(id, reason) {
    return api.post(`/rides/${id}/cancel`, { reason }).then((res) => res.data);
  },
  start(id) {
    return api.post(`/rides/${id}/start`).then((res) => res.data);
  },
  complete(id) {
    return api.post(`/rides/${id}/complete`).then((res) => res.data);
  },
  getById(id) {
    return api.get(`/rides/${id}`).then((res) => res.data);
  },
  listMine() {
    return api.get("/rides/mine").then((res) => res.data);
  },
  search(params) {
    return api.get("/rides/search", { params }).then((res) => res.data);
  },
  createRequest(rideId, payload) {
    return api.post(`/rides/${rideId}/requests`, payload).then((res) => res.data);
  },
  listRequests(rideId) {
    return api.get(`/rides/${rideId}/requests`).then((res) => res.data);
  },
  acceptRequest(requestId) {
    return api.put(`/ride-requests/${requestId}/accept`).then((res) => res.data);
  },
  rejectRequest(requestId) {
    return api.put(`/ride-requests/${requestId}/reject`).then((res) => res.data);
  },
  cancelRequest(requestId) {
    return api.put(`/ride-requests/${requestId}/cancel`).then((res) => res.data);
  },
  getLiveLocation(rideId) {
    return api.get(`/rides/${rideId}/live-location`).then((res) => res.data);
  },
};
