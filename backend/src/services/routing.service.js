import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// Most points kept for a ride's road route - plenty at the 1-10 km scale the
// pickup zones work at, and small to store and query.
const MAX_POINTS = 400;

export function simplifyPath(points) {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.round(i * step)]);
}

/**
 * Road route between two points from the same routing service the app's maps
 * use (OSRM). Returns [[lat, lng], ...], or null if routing is off/unavailable.
 */
export async function fetchRoadRoute(source, destination) {
  if (!env.routing.enabled) return null;
  const coords = `${Number(source.longitude)},${Number(source.latitude)};${Number(destination.longitude)},${Number(destination.latitude)}`;
  try {
    const response = await fetch(`${env.routing.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(env.routing.timeoutMs),
      headers: { "User-Agent": "Liftshare/1.0 (ride route lookup)" },
    });
    if (!response.ok) return null;
    const line = (await response.json())?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length < 2) return null;
    return simplifyPath(line.map(([lng, lat]) => [lat, lng]));
  } catch (err) {
    logger.warn(`Road route lookup failed: ${err.message}`);
    return null;
  }
}
