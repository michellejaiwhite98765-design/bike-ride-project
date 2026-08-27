// import http from "http";
// import { app } from "./app.js";
// import { env } from "./config/env.js";
// import { logger } from "./config/logger.js";
// import { pool } from "./config/db.js";
// import { initSocket } from "./realtime/socket.js";

// const httpServer = http.createServer(app);
// initSocket(httpServer);

// const server = httpServer.listen(env.port, () => {
//   logger.info(`BikeRide API listening on port ${env.port} [${env.nodeEnv}]`);
//   logger.info(`Configured client origins: ${JSON.stringify(env.clientUrls || env.clientUrl)}`);
// });

// async function shutdown(signal) {
//   logger.info(`${signal} received, shutting down gracefully`);
//   server.close(async () => {
//     await pool.end();
//     process.exit(0);
//   });
// }

// process.on("SIGINT", () => shutdown("SIGINT"));
// process.on("SIGTERM", () => shutdown("SIGTERM"));
import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";

const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(env.port, "0.0.0.0", () => {
  logger.info(`BikeRide API listening on port ${env.port} [${env.nodeEnv}]`);
  logger.info(
    `Configured client origins: ${JSON.stringify(env.clientUrls || env.clientUrl)}`
  );
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