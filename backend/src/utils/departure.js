import { env } from "../config/env.js";

/**
 * Turns a ride's departureDate (Date at UTC midnight, or "YYYY-MM-DD") and
 * departureTime ("HH:mm", local time) into the real UTC instant, using the
 * app's configured timezone offset.
 */
export function departureInstant(departureDate, departureTime) {
  const dateOnly =
    departureDate instanceof Date ? departureDate.toISOString().slice(0, 10) : String(departureDate).slice(0, 10);
  const localAsUtc = new Date(`${dateOnly}T${departureTime}:00.000Z`);
  return new Date(localAsUtc.getTime() - env.timezoneOffsetMinutes * 60 * 1000);
}
