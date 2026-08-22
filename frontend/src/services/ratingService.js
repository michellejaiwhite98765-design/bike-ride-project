import { api } from "./api.js";

export const ratingService = {
  create(payload) {
    return api.post("/ratings", payload).then((res) => res.data);
  },
};
