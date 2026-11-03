import { api } from "./api.js";

export const userService = {
  updateProfile(payload) {
    return api.put("/users/me", payload).then((res) => res.data);
  },
  // Changing the mobile number, step 1: OTP to the user's current number.
  sendOwnPhoneOtp() {
    return api.post("/users/me/phone-otp").then((res) => res.data);
  },
  verifyOwnPhoneOtp(otp) {
    return api.post("/users/me/phone-otp/verify", { otp }).then((res) => res.data);
  },
  // Any picture; the server stores a small square copy. Returns the updated user.
  uploadPhoto(file) {
    const form = new FormData();
    form.append("photo", file);
    return api.put("/users/me/photo", form, { timeout: 120000 }).then((res) => res.data);
  },
  removePhoto() {
    return api.delete("/users/me/photo").then((res) => res.data);
  },
  getPublicProfile(id) {
    return api.get(`/users/${id}`).then((res) => res.data);
  },
  getRatings(id) {
    return api.get(`/users/${id}/ratings`).then((res) => res.data);
  },
};
