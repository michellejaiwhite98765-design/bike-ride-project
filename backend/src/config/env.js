import "dotenv/config";

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Allow multiple client origins by separating with commas, default includes common dev ports
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim()),
  // Primary client URL (first in the list) for building links
  clientUrl: ((process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174").split(",")[0] || "http://localhost:5173").trim(),
  payment: {
    keyId: process.env.PAYMENT_KEY_ID || "",
    keySecret: process.env.PAYMENT_KEY_SECRET || "",
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
  },
  mapApiKey: process.env.MAP_API_KEY || "",
  tracking: {
    snapshotIntervalMs: Number(process.env.TRACKING_SNAPSHOT_INTERVAL_MS || 20000),
    staleAfterMs: Number(process.env.TRACKING_STALE_AFTER_MS || 30000),
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
  },
  matching: {
    pickupRadiusKm: Number(process.env.DEFAULT_PICKUP_RADIUS_KM || 2),
    destinationRadiusKm: Number(process.env.DEFAULT_DESTINATION_RADIUS_KM || 2),
    timeWindowMinutes: Number(process.env.DEFAULT_TIME_WINDOW_MINUTES || 30),
  },
  // Two-zone pickup (see utils/pickupZone.js). Distances are from the
  // rider's road route, in km.
  pickupZone: {
    // Zone 1: within this distance of the route - a normal pickup, no extra fare.
    onRouteKm: Number(process.env.PICKUP_ON_ROUTE_KM || 2.5),
    // Zone 2 (detour): the rider can leave the route by up to this % of the
    // route length (e.g. 20% of a 100 km trip = 20 km)...
    detourPercent: Number(process.env.DETOUR_MAX_PERCENT || 20),
    // ...but never more than this many km, however long the trip.
    detourMaxKm: Number(process.env.DETOUR_MAX_KM || 30),
    // Extra fare per km the rider travels off the route (there and back).
    // Paid rides use their own per-km rate when it's higher.
    tipRatePerKm: Number(process.env.TIP_RATE_PER_KM || 5),
  },
  // Trip lifecycle (see services/tripLifecycle.service.js).
  lifecycle: {
    // Departure times are entered in local time.
    timeZone: process.env.RIDE_TIMEZONE || "Asia/Kolkata",
    // A ride that never started expires this long after its departure time.
    expireAfterHours: Number(process.env.RIDE_EXPIRE_AFTER_HOURS || 2),
    // An accepted passenger must pay within this many minutes, or the seat is released.
    paymentDeadlineMinutes: Number(process.env.PAYMENT_DEADLINE_MINUTES || 30),
    sweepIntervalMs: Number(process.env.LIFECYCLE_SWEEP_INTERVAL_MS || 60 * 1000),
  },
  // Road routing (OSRM) to save a ride's real road route.
  routing: {
    enabled: (process.env.ROUTING_ENABLED ?? "true") !== "false",
    baseUrl: process.env.ROUTING_URL || "https://router.project-osrm.org",
    timeoutMs: Number(process.env.ROUTING_TIMEOUT_MS || 8000),
  },
  platformFeeFlat: Number(process.env.PLATFORM_FEE_FLAT || 5),
  way2Api: {
    baseUrl: process.env.WAY2API_RC_URL || "https://app.way2api.com/api/v1/rc/verify",
    apiKey: process.env.WAY2API_API_KEY || "",
    timeoutMs: Number(process.env.WAY2API_TIMEOUT_MS || 15000),
  },rcOcr: {
    timeoutMs: Number(process.env.RC_OCR_TIMEOUT_MS || 45000),
    maxPages: Number(process.env.RC_OCR_MAX_PAGES || 3),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "bikeride",
  },
};
