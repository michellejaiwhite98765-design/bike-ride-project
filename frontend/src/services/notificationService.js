import { api } from "./api.js";

export const notificationService = {
  list() {
    return api.get("/notifications").then((res) => res.data);
  },
  markRead(id) {
    return api.put(`/notifications/${id}/read`);
  },
  markAllRead() {
    return api.put("/notifications/read-all");
  },
};
