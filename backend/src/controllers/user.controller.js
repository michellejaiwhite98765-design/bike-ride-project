import { userService } from "../services/user.service.js";
import { ratingService } from "../services/rating.service.js";
import { serializeUser } from "../utils/serializers.js";
import { ok } from "../utils/apiResponse.js";
import { userRepository } from "../repositories/user.repository.js";
import { drivingLicenceService } from "../services/drivingLicence.service.js";
import { toProfilePhoto } from "../services/profilePhoto.service.js";

export const userController = {
  async updateMe(req, res) {
    const user = await userService.updateProfile(req.user.id, req.body);
    ok(res, user, "Profile updated");
  },

  async setPhoto(req, res) {
    const profileImage = await toProfilePhoto(req.file.buffer);
    const user = await userRepository.update(req.user.id, { profileImage });
    ok(res, serializeUser(user), "Profile photo updated");
  },

  async removePhoto(req, res) {
    const user = await userRepository.update(req.user.id, { profileImage: null });
    ok(res, serializeUser(user), "Profile photo removed");
  },

  async sendOwnPhoneOtp(req, res) {
    const result = await userService.sendOwnPhoneOtp(req.user.id);
    ok(res, result, result.devOtp ? "Verification code generated (test mode - no SMS sent)" : "Verification code sent");
  },

  async verifyOwnPhoneOtp(req, res) {
    const result = await userService.verifyOwnPhoneOtp(req.user.id, req.body.otp);
    ok(res, result, "Current number verified");
  },

  async getLicence(req, res) {
    ok(res, await drivingLicenceService.get(req.user.id));
  },

  async submitLicence(req, res) {
    const licence = await drivingLicenceService.submit(req.user.id, req.body, req.file);
    ok(res, licence, "Driving licence verified");
  },

  async riderStatus(req, res) {
    ok(res, await drivingLicenceService.riderStatus(req.user.id));
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
