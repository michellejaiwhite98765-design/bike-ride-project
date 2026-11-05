import { authService } from "../services/auth.service.js";
import { phoneOtpService } from "../services/phoneOtp.service.js";
import { ok, created } from "../utils/apiResponse.js";

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    created(res, result, "Registration successful");
  },

  async sendPhoneOtp(req, res) {
    const result = await phoneOtpService.send(req.body.phone);
    ok(res, result, result.devOtp ? "Verification code generated (test mode - no SMS sent)" : "Verification code sent");
  },

  async verifyPhoneOtp(req, res) {
    const result = await phoneOtpService.verify(req.body.phone, req.body.otp, req.body.firebaseIdToken);
    ok(res, result, "Phone number verified");
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    ok(res, result, "Login successful");
  },

  async logout(_req, res) {
    ok(res, null, "Logged out successfully");
  },

  async me(req, res) {
    const user = await authService.me(req.user);
    ok(res, user);
  },

  async forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body);
    ok(res, null, result.message);
  },

  async resetPassword(req, res) {
    const result = await authService.resetPassword(req.body);
    ok(res, null, result.message);
  },
};
