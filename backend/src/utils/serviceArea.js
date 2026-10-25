import { env } from "../config/env.js";

/**
 * Liftshare only operates inside one country (India by default). Every
 * coordinate a user submits - ride start/end, pickup/drop, search points -
 * must fall inside its bounding box, so a ride like Kanyakumari -> Kashmir is
 * fine but Kanyakumari -> America is rejected.
 *
 * This is a server-side safety net: a bounding box is coarse near the border
 * (it also covers e.g. northern Sri Lanka). The frontend does the precise
 * check using the geocoder's country code before anything is submitted.
 */
export function isInServiceArea(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const { minLat, maxLat, minLng, maxLng } = env.serviceArea;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export function serviceAreaMessage() {
  return `Liftshare is currently available only within ${env.serviceArea.countryName}. Choose a location inside ${env.serviceArea.countryName}.`;
}

/**
 * Zod superRefine helper: flags each [latKey, lngKey] pair that's present on
 * the object but outside the service area.
 */
export function refineServiceArea(pairs) {
  return (data, ctx) => {
    for (const [latKey, lngKey] of pairs) {
      if (data[latKey] == null || data[lngKey] == null) continue;
      if (!isInServiceArea(data[latKey], data[lngKey])) {
        ctx.addIssue({ code: "custom", path: [latKey], message: serviceAreaMessage() });
      }
    }
  };
}
