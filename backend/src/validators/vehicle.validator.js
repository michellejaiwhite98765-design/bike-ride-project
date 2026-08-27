import { z } from "zod";

const currentYear = new Date().getFullYear();

const normalizeRegistrationNumber = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();

const registrationNumberSchema = z
  .string({ required_error: "Registration number is required" })
  .trim()
  .min(1, "Registration number is required")
  .max(20, "Registration number is too long")
  .transform(normalizeRegistrationNumber)
  .refine(
    (value) => /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(value) || /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/.test(value),
    "Invalid vehicle registration number"
  );

export const createVehicleSchema = z.object({
  vehicleType: z.enum(["MOTORCYCLE", "SCOOTER", "BICYCLE"], {
    errorMap: () => ({ message: "Invalid vehicle type" }),
  }),
  brand: z.string().trim().min(1, "Brand is required").max(50, "Brand cannot exceed 50 characters"),
  model: z.string().trim().min(1, "Model is required").max(50, "Model cannot exceed 50 characters"),
  registrationNumber: registrationNumberSchema,
  color: z.string().trim().min(1, "Color is required").max(30, "Color cannot exceed 30 characters"),
  manufacturingYear: z.coerce.number().int("Manufacturing year must be a whole number").min(1886, "Invalid manufacturing year").max(currentYear + 1, "Manufacturing year cannot be in the future"),
});

export const updateVehicleSchema = createVehicleSchema.partial();
