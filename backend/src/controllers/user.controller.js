import { userService } from "../services/user.service.js";
import { ratingService } from "../services/rating.service.js";
import { serializeUser } from "../utils/serializers.js";
import { ok } from "../utils/apiResponse.js";

export const userController = {
  async updateMe(req, res) {
    const user = await userService.updateProfile(req.user.id, req.body);
    ok(res, user, "Profile updated");
  },

  async sendOwnPhoneOtp(req, res) {
    const result = await userService.sendOwnPhoneOtp(req.user.id);
    ok(res, result, result.devOtp ? "Verification code generated (test mode - no SMS sent)" : "Verification code sent");
  },

  async verifyOwnPhoneOtp(req, res) {
    const result = await userService.verifyOwnPhoneOtp(req.user.id, req.body.otp);
    ok(res, result, "Current number verified");
  },

  async getMe(req, res) {
    ok(res, serializeUser(req.user));
  },

  async getPublicProfile(req, res) {
    const user = await userService.getPublicProfile(req.params.id);
    ok(res, user);
  },

  async getRatings(req, res) {
    const ratings = await ratingService.listForUser(req.params.id);
    ok(res, ratings);
  },
};
