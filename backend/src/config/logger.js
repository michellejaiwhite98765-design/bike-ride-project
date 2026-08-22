import winston from "winston";
import { env } from "./env.js";

export const logger = winston.createLogger({
  level: env.nodeEnv === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.nodeEnv === "production" ? winston.format.json() : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

export const morganStream = {
  write: (message) => logger.http ? logger.http(message.trim()) : logger.info(message.trim()),
};
