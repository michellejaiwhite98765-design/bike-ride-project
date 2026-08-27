import { api } from "./api.js";

export const vehicleService = {
  list() {
    return api.get("/vehicles").then((res) => res.data);
  },
  getById(id) {
    return api.get(`/vehicles/${id}`).then((res) => res.data);
  },
  create(payload) {
    return api.post("/vehicles", payload).then((res) => res.data);
  },
  update(id, payload) {
    return api.put(`/vehicles/${id}`, payload).then((res) => res.data);
  },
  uploadRcDocument(id, file) {
    const formData = new FormData();
    formData.append("rcDocument", file);
    return api.post(`/vehicles/${id}/rc-document`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data);
  },
  verify(id) {
    return api.post(`/vehicles/${id}/verify`).then((res) => res.data);
  },
  remove(id) {
    return api.delete(`/vehicles/${id}`);
  },
};
