import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";
import { rideService } from "./services/ride.service.js";
import { tripLifecycleService } from "./services/tripLifecycle.service.js";

const httpServer = http.createServer(app);
initSocket(httpServer);

// Open rides created without a road route (older app versions, or routing
// was down) are matched against the straight start-end line until their
// route is saved - fill those in now and every 5 minutes.
async function backfillRoadRoutes() {
  try {
    const filled = await rideService.backfillRoadRoutes();
    if (filled > 0) logger.info(`Saved road routes for ${filled} ride(s)`);
  } catch (err) {
    logger.warn(`Road route backfill failed: ${err.message}`);
  }
}
backfillRoadRoutes();
setInterval(backfillRoadRoutes, 5 * 60 * 1000).unref();

// Expire rides that never started and release seats nobody paid for in time.
async function sweepTrips() {
  const { expired, unpaidReleased } = await tripLifecycleService.sweep();
  if (expired || unpaidReleased) logger.info(`Trip sweep: ${expired} ride(s) expired, ${unpaidReleased} unpaid seat(s) released`);
}
sweepTrips();
setInterval(sweepTrips, env.lifecycle.sweepIntervalMs).unref();

const server = httpServer.listen(env.port, () => {
  logger.info(`BikeRide API listening on port ${env.port} [${env.nodeEnv}]`);
  logger.info(`Configured client origins: ${JSON.stringify(env.clientUrls || env.clientUrl)}`);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
