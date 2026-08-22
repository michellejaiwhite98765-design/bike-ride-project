import { api } from "./api.js";

export const userService = {
  updateProfile(payload) {
    return api.put("/users/me", payload).then((res) => res.data);
  },
  getPublicProfile(id) {
    return api.get(`/users/${id}`).then((res) => res.data);
  },
  getRatings(id) {
    return api.get(`/users/${id}/ratings`).then((res) => res.data);
  },
};
