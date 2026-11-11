import { feedbackRepository } from "../repositories/feedback.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

const STATUS_TEXT = { OPEN: "open", IN_REVIEW: "being looked at", RESOLVED: "resolved" };

export const feedbackService = {
  async create(userId, data) {
    const feedback = await feedbackRepository.create(userId, data);
    await audit(null, { userId, action: "FEEDBACK_SUBMITTED", entityType: "CustomerFeedback", entityId: feedback.id });
    return feedback;
  },

  listMine(userId) {
    return feedbackRepository.findByUser(userId);
  },

  listAll() {
    return feedbackRepository.findAll();
  },

  /** Admin changes the status and/or replies; the customer is told either way. */
  async update(adminId, id, { status, adminReply }) {
    const existing = await feedbackRepository.findById(id);
    if (!existing) throw ApiError.notFound("Feedback not found");
    const changes = {};
    if (status) changes.status = status;
    if (adminReply) {
      changes.adminReply = adminReply;
      changes.repliedAt = new Date();
      // A reply means someone is on it.
      if (!status && existing.status === "OPEN") changes.status = "IN_REVIEW";
    }
    const updated = await feedbackRepository.update(id, changes);
    await audit(null, { userId: adminId, action: "FEEDBACK_UPDATED", entityType: "CustomerFeedback", entityId: id });
    await notificationService.dispatch({
      userId: existing.userId,
      type: "FEEDBACK_UPDATED",
      title: adminReply ? "We replied to your feedback" : "Feedback update",
      message: adminReply ? adminReply.slice(0, 140) : `Your feedback is now ${STATUS_TEXT[updated.status]}`,
      data: { feedbackId: id },
    });
    return updated;
  },
};
