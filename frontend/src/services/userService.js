import { api } from "./api.js";
import { firebasePhoneEnabled, sendBoth, verifyEither } from "./firebasePhone.js";

export const userService = {
  updateProfile(payload) {
    return api.put("/users/me", payload).then((res) => res.data);
  },
  // Changing the mobile number, step 1: OTP to the user's current number.
  // currentPhone: the user's own number (Firebase sends the SMS from the app).
  sendOwnPhoneOtp(currentPhone) {
    const viaServer = () => api.post("/users/me/phone-otp").then((res) => res.data);
    if (!firebasePhoneEnabled) return viaServer();
    return sendBoth(currentPhone, viaServer);
  },
  async verifyOwnPhoneOtp(otp, currentPhone) {
    return verifyEither(
      currentPhone,
      otp,
      (firebaseIdToken) => api.post("/users/me/phone-otp/verify", { firebaseIdToken }).then((res) => res.data),
      () => api.post("/users/me/phone-otp/verify", { otp }).then((res) => res.data)
    );
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
  submitLicence({ licenceNumber, holderName, expiryDate, dateOfBirth, file }) {
    const form = new FormData();
    form.append("licenceNumber", licenceNumber);
    if (holderName) form.append("holderName", holderName);
    form.append("expiryDate", expiryDate);
    if (dateOfBirth) form.append("dateOfBirth", dateOfBirth);
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
  // { asDriver: true } = only reviews from trips the user drove.
  getRatings(id, { asDriver = false } = {}) {
    return api.get(`/users/${id}/ratings`, asDriver ? { params: { as: "driver" } } : undefined).then((res) => res.data);
  },
};
