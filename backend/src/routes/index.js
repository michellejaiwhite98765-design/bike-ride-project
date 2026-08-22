import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { vehicleRoutes } from "./vehicle.routes.js";
import { rideRoutes } from "./ride.routes.js";
import { rideRequestActionRoutes } from "./rideRequestActions.routes.js";
import { bookingRoutes } from "./booking.routes.js";
import { paymentRoutes } from "./payment.routes.js";
import { notificationRoutes } from "./notification.routes.js";
import { ratingRoutes } from "./rating.routes.js";
import { safetyReportRoutes } from "./safetyReport.routes.js";
import { adminRoutes } from "./admin.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/vehicles", vehicleRoutes);
apiRouter.use("/rides", rideRoutes);
apiRouter.use("/ride-requests", rideRequestActionRoutes);
apiRouter.use("/bookings", bookingRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/ratings", ratingRoutes);
apiRouter.use("/safety-reports", safetyReportRoutes);
apiRouter.use("/admin", adminRoutes);
