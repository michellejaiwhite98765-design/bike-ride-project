import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req, res) => {
    return !req.ip && !req.connection.remoteAddress;
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
  keyGenerator: (req, res) => {
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req, res) => {
    return !req.ip && !req.connection.remoteAddress;
  },
});
