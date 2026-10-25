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
    // How far a passenger's pickup/drop may be from the ride's route to join,
    // depending on the ride's pickup preference:
    // - ON_ROUTE: the passenger comes to the road the rider is already taking,
    //   so roughly a short walk.
    // - PASSENGER_LOCATION: the rider detours to the passenger, so a little
    //   more, but still a small detour on a bike.
    joinRadiusOnRouteKm: Number(process.env.JOIN_RADIUS_ON_ROUTE_KM || 1),
    joinRadiusPassengerLocationKm: Number(process.env.JOIN_RADIUS_PASSENGER_LOCATION_KM || 2),
  },
  rideStart: {
    // How early before the scheduled departure the rider may start the ride.
    earlyStartMinutes: Number(process.env.RIDE_EARLY_START_MINUTES || 30),
  },
  rideExpiry: {
    // A ride that was never started is closed (EXPIRED) this long after its
    // departure time, so it stops showing in search and no longer blocks the
    // rider from creating their next trip.
    afterDepartureMinutes: Number(process.env.RIDE_EXPIRE_AFTER_MINUTES || 120),
    sweepIntervalMs: Number(process.env.RIDE_EXPIRY_SWEEP_MS || 5 * 60 * 1000),
  },
  // The one country rides may take place in (bounding box; see utils/serviceArea.js).
  serviceArea: {
    countryName: process.env.SERVICE_COUNTRY_NAME || "India",
    minLat: Number(process.env.SERVICE_MIN_LAT ?? 6.0),
    maxLat: Number(process.env.SERVICE_MAX_LAT ?? 37.6),
    minLng: Number(process.env.SERVICE_MIN_LNG ?? 68.0),
    maxLng: Number(process.env.SERVICE_MAX_LNG ?? 97.5),
  },
  // departureDate/departureTime are entered in the riders' local time. They are
  // stored without a zone, so this offset turns them into a real instant
  // (default IST, UTC+05:30).
  timezoneOffsetMinutes: Number(process.env.APP_TZ_OFFSET_MINUTES ?? 330),
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
