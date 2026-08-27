import { userService } from "../services/user.service.js";
import { ratingService } from "../services/rating.service.js";
import { serializeUser } from "../utils/serializers.js";
import { ok } from "../utils/apiResponse.js";

export const userController = {
  async updateMe(req, res) {
    const user = await userService.updateProfile(req.user.id, req.body);
    ok(res, user, "Profile updated");
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
