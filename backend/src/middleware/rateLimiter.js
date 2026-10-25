import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// The test suite creates far more users and calls than a real client from
// one IP would; limits are for real traffic only.
const skipInTests = () => env.nodeEnv === "test";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
  skip: skipInTests,
});
