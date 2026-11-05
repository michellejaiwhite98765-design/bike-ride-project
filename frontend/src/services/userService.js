import { api } from "./api.js";
import { firebasePhone, firebasePhoneEnabled } from "./firebasePhone.js";

export const userService = {
  updateProfile(payload) {
    return api.put("/users/me", payload).then((res) => res.data);
  },
  // Changing the mobile number, step 1: OTP to the user's current number.
  // currentPhone: the user's own number (Firebase sends the SMS from the app).
  sendOwnPhoneOtp(currentPhone) {
    const viaServer = () => api.post("/users/me/phone-otp").then((res) => res.data);
    if (!firebasePhoneEnabled) return viaServer();
    // If Firebase can't send real SMS yet (no billing), use the server's code instead.
    return firebasePhone.send(currentPhone).catch((err) => (err.fallback ? viaServer() : Promise.reject(err)));
  },
  async verifyOwnPhoneOtp(otp, currentPhone) {
    if (firebasePhoneEnabled && firebasePhone.isPending(currentPhone)) {
      const firebaseIdToken = await firebasePhone.confirm(currentPhone, otp);
      return api.post("/users/me/phone-otp/verify", { firebaseIdToken }).then((res) => res.data);
    }
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
  // Driving licence verification: { status: NOT_SUBMITTED | VERIFIED | REJECTED | EXPIRED, ... }
  getLicence() {
    return api.get("/users/me/licence").then((res) => res.data);
  },
  // OCR on the server checks the number is on the document (can take a while on small servers).
  submitLicence({ licenceNumber, holderName, expiryDate, file }) {
    const form = new FormData();
    form.append("licenceNumber", licenceNumber);
    if (holderName) form.append("holderName", holderName);
    form.append("expiryDate", expiryDate);
    form.append("licenceDocument", file);
    return api.put("/users/me/licence", form, { timeout: 120000 }).then((res) => res.data);
  },
  // { isRider (has a vehicle), canCreateTrip, missing: ["LICENCE","VEHICLE"], licence, ... }
  getRiderStatus() {
    return api.get("/users/me/rider-status").then((res) => res.data);
  },
  getPublicProfile(id) {
    return api.get(`/users/${id}`).then((res) => res.data);
  },
  getRatings(id) {
    return api.get(`/users/${id}/ratings`).then((res) => res.data);
  },
};
