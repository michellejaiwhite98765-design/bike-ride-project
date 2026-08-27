import { z } from "zod";

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

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
  .refine((data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.departureDate >= today;
  }, { message: "departureDate cannot be in the past", path: ["departureDate"] });

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
