import { notificationRepository } from "../repositories/notification.repository.js";
import { ok } from "../utils/apiResponse.js";

export const notificationController = {
  async list(req, res) {
    const notifications = await notificationRepository.findByUser(req.user.id);
    ok(res, notifications);
  },

  async markRead(req, res) {
    await notificationRepository.markRead(req.params.id, req.user.id);
    ok(res, null, "Notification marked as read");
  },

  async markAllRead(req, res) {
    await notificationRepository.markAllRead(req.user.id);
    ok(res, null, "All notifications marked as read");
  },
};
