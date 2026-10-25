import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// Most points the server keeps for a ride's road route - plenty for "is this
// passenger near the route" at the 1-2 km scale, and small to store/query.
const MAX_POINTS = 400;

function simplify(points) {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.round(i * step)]);
}

/**
 * Looks up the road route between two points with the same routing service
 * the app's maps draw (OSRM), so the server can match passengers along the
 * real road even when a ride was created without one (older rides, clients
 * that didn't send it, or routing failing in the browser at the time).
 * Returns [[lat, lng], ...] or null if routing is off or unavailable.
 */
export async function fetchRoadRoute(source, destination) {
  if (!env.routing.enabled) return null;
  const coords = `${Number(source.longitude)},${Number(source.latitude)};${Number(destination.longitude)},${Number(destination.latitude)}`;
  const url = `${env.routing.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(env.routing.timeoutMs),
      headers: { "User-Agent": "Liftshare/1.0 (ride route lookup)" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const line = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length < 2) return null;
    return simplify(line.map(([lng, lat]) => [lat, lng]));
  } catch (err) {
    logger.warn(`Road route lookup failed: ${err.message}`);
    return null;
  }
}
