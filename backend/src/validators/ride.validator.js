import { z } from "zod";

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

// A couple of minutes of slack so a request that's mid-flight when the
// clock ticks over isn't rejected for being a few seconds "late".
const PAST_DEPARTURE_GRACE_MS = 2 * 60 * 1000;

/**
 * Combines a departureDate (Date, coerced from a YYYY-MM-DD string — always
 * UTC midnight, see z.coerce.date()) with a departureTime ("HH:mm") into a
 * single UTC instant, then checks it isn't already behind the server clock.
 *
 * This intentionally compares the FULL date+time (not just the date) against
 * the current instant (not server-local midnight) so both sides of the
 * comparison use the same, unambiguous UTC reference point — the previous
 * version mixed a UTC-parsed date with a server-local "today", which meant
 * the outcome silently depended on the server's timezone, and never
 * accounted for departureTime at all.
 */
function isDepartureInPast(departureDate, departureTime) {
  const dateOnly = departureDate.toISOString().slice(0, 10);
  const departureInstant = new Date(`${dateOnly}T${departureTime}:00.000Z`);
  return departureInstant.getTime() < Date.now() - PAST_DEPARTURE_GRACE_MS;
}

export const createRideSchema = z
  .object({
    vehicleId: z.string().uuid(),
    sourceName: z.string().trim().min(1).max(150),
    sourceLatitude: latitude,
    sourceLongitude: longitude,
    destinationName: z.string().trim().min(1).max(150),
    destinationLatitude: latitude,
    destinationLongitude: longitude,
    pickupPreference: z.enum(["ON_ROUTE", "PASSENGER_LOCATION"]).default("ON_ROUTE"),
    departureDate: z.coerce.date(),
    departureTime: timeOfDay,
    availableSeats: z.coerce.number().int().min(1).max(6),
    rideType: z.enum(["WITH_TIP", "WITHOUT_TIP"]),
    tipAmount: z.coerce.number().min(0).max(10000).default(0),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.rideType !== "WITHOUT_TIP" || data.tipAmount === 0, {
    message: "tipAmount must be 0 when rideType is WITHOUT_TIP",
    path: ["tipAmount"],
  })
  .refine((data) => data.rideType !== "WITH_TIP" || data.tipAmount > 0, {
    message: "tipAmount must be greater than 0 when rideType is WITH_TIP",
    path: ["tipAmount"],
  })
  .refine((data) => !isDepartureInPast(data.departureDate, data.departureTime), {
    message: "departureDate/departureTime cannot be in the past",
    path: ["departureDate"],
  });

export const updateRideSchema = z
  .object({
    sourceName: z.string().trim().min(1).max(150).optional(),
    sourceLatitude: latitude.optional(),
    sourceLongitude: longitude.optional(),
    destinationName: z.string().trim().min(1).max(150).optional(),
    destinationLatitude: latitude.optional(),
    destinationLongitude: longitude.optional(),
    pickupPreference: z.enum(["ON_ROUTE", "PASSENGER_LOCATION"]).optional(),
    departureDate: z.coerce.date().optional(),
    departureTime: timeOfDay.optional(),
    rideType: z.enum(["WITH_TIP", "WITHOUT_TIP"]).optional(),
    tipAmount: z.coerce.number().min(0).max(10000).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => !(data.rideType === "WITHOUT_TIP" && data.tipAmount && data.tipAmount > 0),
    { message: "tipAmount must be 0 when rideType is WITHOUT_TIP", path: ["tipAmount"] }
  )
  .refine(
    (data) =>
      !data.departureDate ||
      !data.departureTime ||
      !isDepartureInPast(data.departureDate, data.departureTime),
    { message: "departureDate/departureTime cannot be in the past", path: ["departureDate"] }
  );

export const searchRideSchema = z.object({
  sourceLatitude: latitude,
  sourceLongitude: longitude,
  destinationLatitude: latitude,
  destinationLongitude: longitude,
  date: z.coerce.date(),
  time: timeOfDay.optional(),
  seats: z.coerce.number().int().min(1).max(6).default(1),
  rideType: z.enum(["WITH_TIP", "WITHOUT_TIP"]).optional(),
  radius: z.coerce.number().positive().max(50).optional(),
});
