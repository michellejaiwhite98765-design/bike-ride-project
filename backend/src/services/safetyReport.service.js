import { safetyReportRepository } from "../repositories/safetyReport.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

export const safetyReportService = {
  async create(reporterId, data) {
    if (data.reportedUserId === reporterId) throw ApiError.badRequest("You cannot report yourself");
    const report = await safetyReportRepository.create(reporterId, data);
    await audit(null, { userId: reporterId, action: "SAFETY_REPORT_FILED", entityType: "SafetyReport", entityId: report.id });
    return report;
  },

  listAll() {
    return safetyReportRepository.findAll();
  },

  async updateStatus(adminId, reportId, { status, adminNotes }) {
    const existing = await safetyReportRepository.findById(reportId);
    if (!existing) throw ApiError.notFound("Safety report not found");

    const report = await safetyReportRepository.update(reportId, { status, adminNotes });
    await audit(null, { userId: adminId, action: "SAFETY_REPORT_UPDATED", entityType: "SafetyReport", entityId: reportId });
    await notificationService.notifySafetyReportUpdated(report);
    return report;
  },
};
