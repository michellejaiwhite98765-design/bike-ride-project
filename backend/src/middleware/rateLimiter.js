import rateLimit from "express-rate-limit";

const getClientIp = (req) => {
  // Handle IPv6-mapped IPv4 addresses (::ffff:192.0.2.1 -> 192.0.2.1)
  let ip = req.ip;
  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  return ip || "unknown";
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => getClientIp(req),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
  keyGenerator: (req, res) => getClientIp(req),
});
