import { safetyReportService } from "../services/safetyReport.service.js";
import { created } from "../utils/apiResponse.js";

export const safetyReportController = {
  async create(req, res) {
    const report = await safetyReportService.create(req.user.id, req.body);
    created(res, report, "Safety report filed");
  },
};
