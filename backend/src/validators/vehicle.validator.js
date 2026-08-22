import { z } from "zod";

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z.object({
  vehicleType: z.enum(["MOTORCYCLE", "SCOOTER", "BICYCLE"]),
  brand: z.string().trim().min(1).max(50),
  model: z.string().trim().min(1).max(50),
  registrationNumber: z.string().trim().min(1).max(20).toUpperCase(),
  color: z.string().trim().min(1).max(30),
  manufacturingYear: z.coerce.number().int().min(1980).max(currentYear + 1),
});

export const updateVehicleSchema = createVehicleSchema.partial();
