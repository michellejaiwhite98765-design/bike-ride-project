import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";
import { rideService } from "./services/ride.service.js";

const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(env.port, () => {
  logger.info(`BikeRide API listening on port ${env.port} [${env.nodeEnv}]`);
  logger.info(`Configured client origins: ${JSON.stringify(env.clientUrls || env.clientUrl)}`);
});

// Periodically close rides whose departure passed without them being
// started, so they drop out of search and stop blocking the rider's next trip.
async function sweepStaleRides() {
  try {
    const count = await rideService.expireStaleRides();
    if (count > 0) logger.info(`Expired ${count} ride(s) that were never started`);
  } catch (err) {
    logger.warn(`Stale ride sweep failed: ${err.message}`);
  }
  // Open rides without a saved road route (older rides, or routing was down)
  // only match passengers near the straight start-end line - fill them in.
  try {
    const filled = await rideService.backfillRoadRoutes();
    if (filled > 0) logger.info(`Saved road routes for ${filled} ride(s)`);
  } catch (err) {
    logger.warn(`Road route backfill failed: ${err.message}`);
  }
}
sweepStaleRides();
const sweepTimer = setInterval(sweepStaleRides, env.rideExpiry.sweepIntervalMs);

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  clearInterval(sweepTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
