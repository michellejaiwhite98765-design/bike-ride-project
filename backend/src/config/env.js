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
    // Trips longer than this many km use the lower rate below (cheaper per km on long runs).
    longTripKm: Number(process.env.LONG_TRIP_KM || 300),
    tipRateLongPerKm: Number(process.env.TIP_RATE_LONG_PER_KM || 4),
  },
  // Trip lifecycle (see services/tripLifecycle.service.js).
  lifecycle: {
    // Departure times are entered in local time.
    timeZone: process.env.RIDE_TIMEZONE || "Asia/Kolkata",
    // A driver can create at most this many trips per calendar month.
    monthlyTripLimit: Number(process.env.MONTHLY_TRIP_LIMIT || 50),
    // Join requests are accepted automatically (seat reserved right away) and
    // the driver is told the passenger joined. Set to "false" to go back to
    // the driver accepting each request by hand.
    autoAcceptRequests: process.env.AUTO_ACCEPT_REQUESTS !== "false",
    // A trip not started this many minutes after its start time is cancelled automatically...
    startGraceMinutes: Number(process.env.RIDE_START_GRACE_MINUTES || 15),
    // ...and the rider is warned this many minutes after the start time.
    startReminderMinutes: Number(process.env.RIDE_START_REMINDER_MINUTES || 10),
    // An accepted passenger must pay within this many minutes, or the seat is released.
    paymentDeadlineMinutes: Number(process.env.PAYMENT_DEADLINE_MINUTES || 30),
    sweepIntervalMs: Number(process.env.LIFECYCLE_SWEEP_INTERVAL_MS || 60 * 1000),
  },
  // Joining a trip that has already started (services/liveJoin.service.js).
  // Uses the rider's live location from the tracking WebSocket.
  liveJoin: {
    enabled: process.env.LIVE_JOIN_ENABLED !== "false",
    // No new passengers once the rider has covered this share of the route (0.5 = half way).
    maxProgress: Number(process.env.LIVE_JOIN_MAX_PROGRESS || 0.5),
    // The pickup must still be at least this many km ahead of the rider.
    minAheadKm: Number(process.env.LIVE_JOIN_MIN_AHEAD_KM || 2),
    // The rider's location must be newer than this, or we can't tell where they are.
    staleAfterMs: Number(process.env.LIVE_JOIN_STALE_AFTER_MS || 60 * 1000),
    // A passenger who joins a moving trip must pay within this many minutes.
    paymentDeadlineMinutes: Number(process.env.LIVE_JOIN_PAYMENT_MINUTES || 10),
  },
  // Road routing (OSRM) to save a ride's real road route.
  routing: {
    enabled: (process.env.ROUTING_ENABLED ?? "true") !== "false",
    baseUrl: process.env.ROUTING_URL || "https://router.project-osrm.org",
    timeoutMs: Number(process.env.ROUTING_TIMEOUT_MS || 8000),
  },
  platformFeeFlat: Number(process.env.PLATFORM_FEE_FLAT || 5),
  // Sign-up phone OTP (services/phoneOtp.service.js, services/sms.service.js).
  sms: {
    provider: (process.env.SMS_PROVIDER || "").trim().toLowerCase(),
    // Shows the code in the app too. On by default (also live) until SMS is set up;
    // set OTP_DEV_MODE=false on the server to turn it off.
    otpDevMode: (process.env.OTP_DEV_MODE ?? "true") === "true",
    twoFactor: {
      apiKey: process.env.TWOFACTOR_API_KEY || "",
      template: process.env.TWOFACTOR_TEMPLATE || "",
      baseUrl: process.env.TWOFACTOR_URL || "https://2factor.in/API/V1",
      timeoutMs: Number(process.env.TWOFACTOR_TIMEOUT_MS || 10000),
    },
    fast2sms: {
      apiKey: process.env.FAST2SMS_API_KEY || "",
      baseUrl: process.env.FAST2SMS_URL || "https://www.fast2sms.com/dev/bulkV2",
      timeoutMs: Number(process.env.FAST2SMS_TIMEOUT_MS || 10000),
    },
  },
  // Firebase Phone Auth: the app sends/checks the SMS code with Firebase and the
  // server only verifies Firebase's signed ID token, which needs just the project ID.
  firebase: {
    projectId: (process.env.FIREBASE_PROJECT_ID || "").trim(),
  },
  way2Api: {
    baseUrl: process.env.WAY2API_RC_URL || "https://app.way2api.com/api/v1/rc/verify",
    dlUrl: process.env.WAY2API_DL_URL || "https://app.way2api.com/api/v1/driving-license/verify",
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
