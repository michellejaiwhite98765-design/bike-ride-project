import { authService } from "../services/auth.service.js";
import { ok, created } from "../utils/apiResponse.js";

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    created(res, result, "Registration successful");
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
