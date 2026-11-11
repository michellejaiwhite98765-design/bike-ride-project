import { feedbackService } from "../services/feedback.service.js";
import { created, ok } from "../utils/apiResponse.js";

export const feedbackController = {
  async create(req, res) {
    created(res, await feedbackService.create(req.user.id, req.body), "Thanks for your feedback");
  },
  async listMine(req, res) {
    ok(res, await feedbackService.listMine(req.user.id));
  },
  async listAll(_req, res) {
    ok(res, await feedbackService.listAll());
  },
  async update(req, res) {
    ok(res, await feedbackService.update(req.user.id, req.params.id, req.body), "Feedback updated");
  },
};
