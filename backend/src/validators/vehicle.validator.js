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

const vehicleBaseSchema = z.object({
  vehicleType: z.enum(["MOTORCYCLE", "SCOOTER", "BICYCLE", "CAR"], {
    errorMap: () => ({ message: "Invalid vehicle type" }),
  }),
  brand: z.string().trim().min(1, "Brand is required").max(50, "Brand cannot exceed 50 characters"),
  model: z.string().trim().min(1, "Model is required").max(50, "Model cannot exceed 50 characters"),
  registrationNumber: registrationNumberSchema,
  color: z.string().trim().min(1, "Color is required").max(30, "Color cannot exceed 30 characters"),
  manufacturingYear: z.coerce.number().int("Manufacturing year must be a whole number").min(1886, "Invalid manufacturing year").max(currentYear + 1, "Manufacturing year cannot be in the future"),
  // Only meaningful for CAR; two-wheelers/bicycles always carry exactly one passenger seat.
  seatCapacity: z.coerce.number().int("Seat capacity must be a whole number").min(1).max(8).optional(),
});

export const createVehicleSchema = vehicleBaseSchema
  .superRefine((data, ctx) => {
    if (data.vehicleType === "CAR" && !data.seatCapacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCapacity"],
        message: "Seat capacity is required for cars",
      });
    }
  })
  .transform((data) => ({
    ...data,
    // Two-wheelers/bicycles are always capped at 1 passenger seat, regardless of client input.
    seatCapacity: data.vehicleType === "CAR" ? data.seatCapacity : 1,
  }));

// PUT /vehicles/:id accepts a partial payload (e.g. just { color }), so this
// can't reuse createVehicleSchema's transform/refine chain as-is - the
// CAR/seatCapacity rule only applies here when vehicleType is actually part
// of the update.
export const updateVehicleSchema = vehicleBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.vehicleType === "CAR" && !data.seatCapacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCapacity"],
        message: "Seat capacity is required for cars",
      });
    }
  })
  .transform((data) => (data.vehicleType && data.vehicleType !== "CAR" ? { ...data, seatCapacity: 1 } : data));
