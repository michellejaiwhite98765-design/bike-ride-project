import { z } from "zod";
import { refineServiceArea } from "../utils/serviceArea.js";

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

export const createRideRequestSchema = z.object({
  pickupName: z.string().trim().min(1).max(150),
  pickupLatitude: latitude,
  pickupLongitude: longitude,
  dropName: z.string().trim().min(1).max(150),
  dropLatitude: latitude,
  dropLongitude: longitude,
  seatsRequested: z.coerce.number().int().min(1).max(6).default(1),
  message: z.string().trim().max(300).optional(),
}).superRefine(refineServiceArea([["pickupLatitude", "pickupLongitude"], ["dropLatitude", "dropLongitude"]]));

// GET /rides/:rideId/requests/join-check - could a passenger with this pickup
// (and, optionally, drop) join the ride? Lets the app show "too far" before
// the passenger fills in the whole request.
export const joinCheckQuerySchema = z.object({
  pickupLatitude: latitude,
  pickupLongitude: longitude,
  dropLatitude: latitude.optional(),
  dropLongitude: longitude.optional(),
}).superRefine(refineServiceArea([["pickupLatitude", "pickupLongitude"], ["dropLatitude", "dropLongitude"]]));
