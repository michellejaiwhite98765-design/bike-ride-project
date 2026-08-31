import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { morganStream } from "./config/logger.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { swaggerSpec } from "./config/swagger.js";
import { apiRouter } from "./routes/index.js";
import { paymentController } from "./controllers/payment.controller.js";

export const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.clientUrls || env.clientUrl, credentials: true }));

// Mounted before express.json() because its HMAC signature check needs the raw body.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), paymentController.webhook);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev", { stream: morganStream }));
}
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => res.json({ success: true, message: "OK" }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
