import { env } from "../config/env.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { rideTrackingRepository } from "../repositories/rideTracking.repository.js";
import { locationStore } from "../realtime/locationStore.js";

/**
 * Joining a trip that has already started.
 *
 * The rider's live position comes from the tracking WebSocket
 * (realtime/socket.js): the latest point kept in memory, or the last saved
 * tracking ping when the server has restarted since. A passenger can join
 * only when all of these hold:
 *
 *  1. Live join is on (LIVE_JOIN_ENABLED, default on).
 *  2. The rider's location is fresh: newer than LIVE_JOIN_STALE_AFTER_MS (60 s).
 *     Without it we can't tell where the rider is, so we say no.
 *  3. The rider has covered less than LIVE_JOIN_MAX_PROGRESS of the route (half).
 *  4. The pickup is still ahead of the rider by at least LIVE_JOIN_MIN_AHEAD_KM (2 km),
 *     so the rider hasn't passed it and the passenger has time to get ready.
 *
 * A join on a moving trip is never auto-accepted: the rider confirms it.
 */

export const LIVE_JOIN_REASONS = {
  DISABLED: "This trip has already started and isn't taking new passengers.",
  NO_LOCATION: "This trip has already started and the rider's live location isn't available right now, so you can't join it.",
  PAST_HALF: "This trip is more than half way to its destination, so it isn't taking new passengers.",
  PICKUP_PASSED: "The rider has already passed your pickup point (or is too close to it), so you can't join this trip.",
};

/** The rider's latest known position and when it was taken, or null. */
async function riderPosition(ride) {
  const live = locationStore.get(ride.id, ride.riderId);
  if (live) return { latitude: live.latitude, longitude: live.longitude, at: new Date(live.updatedAt).getTime() };
  const ping = await rideTrackingRepository.latestByRide(ride.id);
  if (ping) return { latitude: Number(ping.latitude), longitude: Number(ping.longitude), at: new Date(ping.createdAt).getTime() };
  return null;
}

/**
 * The rules above as a pure function, so they're easy to test.
 * `progress` is { routeKm, riderFraction, pickupFraction } from the route.
 */
export function evaluateLiveJoin({ position, progress, now = Date.now(), config = env.liveJoin }) {
  if (!config.enabled) return { allowed: false, reason: "DISABLED", message: LIVE_JOIN_REASONS.DISABLED };
  if (!position || !progress || now - position.at > config.staleAfterMs) {
    return { allowed: false, reason: "NO_LOCATION", message: LIVE_JOIN_REASONS.NO_LOCATION };
  }

  const progressPercent = Math.round(progress.riderFraction * 100);
  const remainingKm = round1((1 - progress.riderFraction) * progress.routeKm);
  const info = { progressPercent, remainingKm };

  if (progress.riderFraction >= config.maxProgress) {
    return { allowed: false, reason: "PAST_HALF", message: LIVE_JOIN_REASONS.PAST_HALF, ...info };
  }
  if (progress.pickupFraction != null) {
    const aheadKm = round1((progress.pickupFraction - progress.riderFraction) * progress.routeKm);
    if (aheadKm < config.minAheadKm) {
      return { allowed: false, reason: "PICKUP_PASSED", message: LIVE_JOIN_REASONS.PICKUP_PASSED, ...info, pickupAheadKm: aheadKm };
    }
    return { allowed: true, ...info, pickupAheadKm: aheadKm };
  }
  return { allowed: true, ...info };
}

export const liveJoinService = {
  /**
   * Can a passenger with this pickup still join this started ride?
   * Returns { allowed, reason?, message?, progressPercent?, remainingKm?, pickupAheadKm? }.
   */
  async check(ride, pickup) {
    if (!env.liveJoin.enabled) return evaluateLiveJoin({ position: null, progress: null });
    const position = await riderPosition(ride);
    const progress = position ? await rideRepository.routeProgress(ride.id, position, pickup) : null;
    return evaluateLiveJoin({ position, progress });
  },
};

function round1(n) {
  return Math.round(n * 10) / 10;
}
