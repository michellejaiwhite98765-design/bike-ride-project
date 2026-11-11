import { api, tokenStorage } from "./api.js";
import { firebasePhoneEnabled, sendBoth, verifyEither } from "./firebasePhone.js";

export const authService = {
  // Sign-up phone verification: send a code, then verify it for a token that register() needs.
  // With Firebase Phone Auth on, Firebase sends and checks the SMS code.
  sendPhoneOtp(phone) {
    const viaServer = () => api.post("/auth/phone-otp", { phone }).then((res) => res.data);
    if (!firebasePhoneEnabled) return viaServer();
    return sendBoth(phone, viaServer);
  },
  async verifyPhoneOtp(phone, otp) {
    return verifyEither(
      phone,
      otp,
      (firebaseIdToken) => api.post("/auth/phone-otp/verify", { phone, firebaseIdToken }).then((res) => res.data),
      () => api.post("/auth/phone-otp/verify", { phone, otp }).then((res) => res.data)
    );
  },
  async register(payload) {
    const res = await api.post("/auth/register", payload);
    tokenStorage.set(res.data.token);
    return res.data.user;
  },
  // Passwordless login: a code to the account's mobile number (Firebase SMS,
  // plus the server's own code shown on screen while OTP_DEV_MODE is on).
  sendLoginOtp(phone) {
    const viaServer = () => api.post("/auth/login/otp", { phone }).then((res) => res.data);
    if (!firebasePhoneEnabled) return viaServer();
    return sendBoth(phone, viaServer);
  },
  async loginWithOtp(phone, otp) {
    const data = await verifyEither(
      phone,
      otp,
      (firebaseIdToken) => api.post("/auth/login/otp/verify", { phone, firebaseIdToken }).then((res) => res.data),
      () => api.post("/auth/login/otp/verify", { phone, otp }).then((res) => res.data)
    );
    // New number: verified, but no account yet - the caller asks for their details.
    if (data.isNewUser) return data;
    tokenStorage.set(data.token);
    return data.user;
  },
  async login(payload) {
    const res = await api.post("/auth/login", payload);
    tokenStorage.set(res.data.token);
    return res.data.user;
  },
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStorage.clear();
    }
  },
  async me() {
    const res = await api.get("/auth/me", { timeout: 8000 });
    return res.data;
  },
  forgotPassword(email) {
    return api.post("/auth/forgot-password", { email });
  },
  resetPassword(token, password) {
    return api.post("/auth/reset-password", { token, password });
  },
};
