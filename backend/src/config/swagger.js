import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BikeRide API",
      version: "1.0.0",
      description: "Bike-based ride-sharing and route-matching platform API",
    },
    servers: [{ url: `http://localhost:${env.port}/api` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
});
