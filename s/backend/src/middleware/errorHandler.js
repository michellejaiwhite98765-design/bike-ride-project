import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, errors: err.details });
  }

  if (err?.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    return res.status(409).json({ success: false, message: `${field} already in use` });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ success: false, message: "Resource not found" });
  }

  if (err?.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  logger.error(err.stack || err.message || String(err));
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : err.message,
    ...(env.nodeEnv !== "production" && statusCode === 500 ? { debug: err.message } : {}),
  });
}
