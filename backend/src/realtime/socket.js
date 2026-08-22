import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { userRepository } from "../repositories/user.repository.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { rideTrackingRepository } from "../repositories/rideTracking.repository.js";
import { locationStore } from "./locationStore.js";

const lastSnapshotAtByRide = new Map();

function roomFor(rideId) {
  return `ride:${rideId}`;
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication token missing"));
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) return next(new Error("Invalid or expired session"));
    socket.data.userId = user.id;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

async function assertRideAccess(rideId, userId) {
  const ride = await rideRepository.findStatusById(rideId);
  if (!ride) return { ok: false, reason: "Ride not found" };
  if (ride.riderId === userId) return { ok: true, ride, isOwner: true };
  const isPassenger = await bookingRepository.hasConfirmedForRide(rideId, userId);
  if (!isPassenger) return { ok: false, reason: "Not authorized for this ride" };
  return { ok: true, ride, isOwner: false };
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrls || env.clientUrl, credentials: true },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("ride:join", async (rideId, callback) => {
      const access = await assertRideAccess(rideId, socket.data.userId);
      if (!access.ok) {
        callback?.({ success: false, message: access.reason });
        return;
      }
      socket.join(roomFor(rideId));
      socket.data.rideId = rideId;
      socket.data.isOwner = access.isOwner;
      const lastKnownLocation = locationStore.get(rideId, socket.data.userId);
      const allLocations = locationStore.getAllForRide(rideId);
      callback?.({ success: true, lastKnownLocation, allLocations });
    });

    socket.on("location:update", async (position) => {
      const { rideId, userId } = socket.data;
      if (!rideId) return;
      if (
        typeof position?.latitude !== "number" ||
        typeof position?.longitude !== "number" ||
        Math.abs(position.latitude) > 90 ||
        Math.abs(position.longitude) > 180
      ) {
        return;
      }

      const ride = await rideRepository.findStatusById(rideId);
      if (ride?.status !== "STARTED") return;

      const isOwner = ride.riderId === userId;
      const isPassenger = !isOwner && await bookingRepository.hasConfirmedForRide(rideId, userId);
      if (!isOwner && !isPassenger) return;

      const point = {
        userId,
        riderId: ride.riderId,
        latitude: position.latitude,
        longitude: position.longitude,
        headingDeg: position.headingDeg ?? null,
        speedKph: position.speedKph ?? null,
        userType: isOwner ? "rider" : "passenger",
        updatedAt: new Date().toISOString(),
      };
      locationStore.set(rideId, userId, point);
      io.to(roomFor(rideId)).emit("location:broadcast", point);

      const lastSnapshot = lastSnapshotAtByRide.get(rideId) || 0;
      if (Date.now() - lastSnapshot >= env.tracking.snapshotIntervalMs) {
        lastSnapshotAtByRide.set(rideId, Date.now());
        rideTrackingRepository
          .createPing(rideId, point)
          .catch((err) => logger.warn(`Failed to persist tracking ping for ride ${rideId}: ${err.message}`));
      }
    });

    socket.on("ride:leave", () => {
      if (socket.data.rideId) socket.leave(roomFor(socket.data.rideId));
    });

    socket.on("disconnect", () => {
      if (socket.data.rideId) lastSnapshotAtByRide.delete(socket.data.rideId);
    });
  });

  return io;
}
