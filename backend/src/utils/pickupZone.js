import { env } from "../config/env.js";

/**
 * Two-zone pickup rule. A passenger's pickup (and drop) is measured against
 * the rider's road route:
 *
 *  - ON_ROUTE: within PICKUP_ON_ROUTE_KM (2.5 km) of the route - a normal
 *              pickup at the ride's normal fare.
 *  - DETOUR:   farther, but within the detour limit - the rider leaves the
 *              route to collect (or drop) the passenger, and the fare goes up
 *              for the extra km.
 *  - TOO_FAR:  beyond the detour limit - can't join.
 *
 * Detour limit: DETOUR_MAX_PERCENT (20%) of the route length, at least the
 * on-route radius and at most DETOUR_MAX_KM (30 km).
 *   Colachel -> Tirunelveli (~100 km): limit 20 km, so a passenger in
 *   Marthandam (~15 km off the route) can still join.
 *
 * Extra fare: the rider goes off the route and comes back, so
 *   extraKm       = 2 x (pickup's distance off the route + drop's, when the drop is off the route too)
 *   detourPercent = extraKm / routeKm x 100   (how much longer the rider's trip gets)
 *   ratePerKm     = the ride's own fare per km (tip / routeKm), but never below TIP_RATE_PER_KM (Rs 5)
 *   extraFare     = extraKm x ratePerKm
 *   e.g. Marthandam, 15 km off a 100 km route: 30 extra km = trip +30%, extra fare Rs 150.
 */
export function detourLimitKm(routeKm) {
  const c = env.pickupZone;
  const km = Number(routeKm) || 0;
  return round1(Math.min(c.detourMaxKm, Math.max(c.onRouteKm, (km * c.detourPercent) / 100)));
}

/** Fare per km for the extra distance: the ride's own rate, or the default when that's lower (or the ride is free). */
export function detourRatePerKm(routeKm, baseFare = 0) {
  const ownRate = Number(routeKm) > 0 ? Number(baseFare) / Number(routeKm) : 0;
  return Math.max(env.pickupZone.tipRatePerKm, ownRate);
}

/** Extra fare for a detour: off-route distance there and back, at the per-km rate. */
export function detourFare(offRouteKm, routeKm, baseFare = 0) {
  const extraKm = round1(Number(offRouteKm) * 2);
  const ratePerKm = round1(detourRatePerKm(routeKm, baseFare));
  const detourPercent = Number(routeKm) > 0 ? round1((extraKm / Number(routeKm)) * 100) : 0;
  return { extraKm, ratePerKm, detourPercent, extraTip: Math.round(extraKm * ratePerKm) };
}

/**
 * Classifies a pickup/drop for a ride.
 * @param routeKm     length of the rider's route
 * @param pickupKm    pickup's distance from the route
 * @param dropKm      drop's distance from the route (optional)
 * @param goesForward false when the drop comes before the pickup along the route
 * @param baseFare    the ride's tip per seat (0 for a free ride)
 */
export function classifyPickup({ routeKm, pickupKm, dropKm = null, goesForward = true, baseFare = 0 }) {
  const onRouteKm = env.pickupZone.onRouteKm;
  const limitKm = detourLimitKm(routeKm);
  const pickup = round1(pickupKm);
  const drop = dropKm == null ? null : round1(dropKm);
  const base = {
    onRouteKm,
    limitKm,
    routeKm: round1(routeKm),
    pickupDistanceKm: pickup,
    dropDistanceKm: drop,
    extraKm: 0,
    detourPercent: 0,
    ratePerKm: 0,
    extraTip: 0,
  };

  if (!goesForward) {
    return { ...base, zone: "TOO_FAR", reason: "WRONG_DIRECTION",
      message: "Your drop point comes before your pickup on this ride's route - this ride is going the other way." };
  }
  if (drop != null && drop > limitKm) {
    return { ...base, zone: "TOO_FAR", reason: "DROP_TOO_FAR",
      message: `Your drop point is ${drop} km from this ride's route. The rider can go at most ${limitKm} km off their route.` };
  }
  if (pickup > limitKm) {
    return { ...base, zone: "TOO_FAR", reason: "PICKUP_TOO_FAR",
      message: `You're ${pickup} km from this ride's route - too far. The rider can go at most ${limitKm} km off their route for this trip.` };
  }

  // Only the legs that are actually off the route add distance.
  const offRouteKm = (pickup > onRouteKm ? pickup : 0) + (drop != null && drop > onRouteKm ? drop : 0);
  if (offRouteKm > 0) {
    const fare = detourFare(offRouteKm, routeKm, baseFare);
    return { ...base, ...fare, zone: "DETOUR", reason: null,
      message: `The rider goes ${fare.extraKm} km extra to pick you up (trip +${fare.detourPercent}%), so the fare goes up by ₹${fare.extraTip} (₹${fare.ratePerKm}/km).` };
  }
  return { ...base, zone: "ON_ROUTE", reason: null, message: null };
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}
