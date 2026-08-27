import { api } from "./api.js";

export const safetyService = {
  createReport(payload) {
    return api.post("/safety-reports", payload).then((res) => res.data);
  },
};
