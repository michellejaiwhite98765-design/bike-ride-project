import { api } from "./api.js";

export const FEEDBACK_CATEGORIES = [
  { value: "APP", label: "App" },
  { value: "RIDE", label: "Ride" },
  { value: "PAYMENT", label: "Payment" },
  { value: "DRIVER", label: "Driver" },
  { value: "SUGGESTION", label: "Suggestion" },
  { value: "OTHER", label: "Other" },
];

export const FEEDBACK_STATUS = {
  OPEN: { label: "Received", color: "blue" },
  IN_REVIEW: { label: "In review", color: "gold" },
  RESOLVED: { label: "Resolved", color: "green" },
};

export const feedbackService = {
  create: (payload) => api.post("/feedback", payload).then((res) => res.data),
  listMine: () => api.get("/feedback").then((res) => res.data),
  listAll: () => api.get("/admin/feedback").then((res) => res.data),
  update: (id, payload) => api.put(`/admin/feedback/${id}`, payload).then((res) => res.data),
};
