import { z } from "zod";

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
});
