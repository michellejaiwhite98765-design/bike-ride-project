// Shared geo helpers used by the ride details page (distance display) and the
// ride creation map/location tools (reverse geocoding, current-location fill,
// shared-link parsing) - factored out so there's one implementation instead
// of copies drifting apart.

// Liftshare runs in one country. Place searches are limited to it and any
// point outside it (picked on a map, shared link, current location abroad)
// is refused - the backend enforces the same rule as a safety net.
export const SERVICE_AREA = {
  countryCode: "in",
  countryName: "India",
  // Coarse bounding box, used only when the geocoder gives no country code.
  bounds: { minLat: 6.0, maxLat: 37.6, minLng: 68.0, maxLng: 97.5 },
};

// Append to Nominatim /search URLs so suggestions only come from the service country.
export const NOMINATIM_COUNTRY_FILTER = `&countrycodes=${SERVICE_AREA.countryCode}`;

export const OUTSIDE_SERVICE_AREA_MESSAGE = `Liftshare is currently available only within ${SERVICE_AREA.countryName}. Please choose a location inside ${SERVICE_AREA.countryName}.`;

/**
 * Error message if a point is outside the service country, else null.
 * Prefers the geocoder's country code (accurate at borders); falls back to
 * the bounding box when there isn't one.
 */
export function serviceAreaError({ countryCode, latitude, longitude } = {}) {
  if (countryCode) {
    return countryCode.toLowerCase() === SERVICE_AREA.countryCode ? null : OUTSIDE_SERVICE_AREA_MESSAGE;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const { minLat, maxLat, minLng, maxLng } = SERVICE_AREA.bounds;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng ? null : OUTSIDE_SERVICE_AREA_MESSAGE;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reverse-geocodes a point via Nominatim, returning a display name plus the
 * resolved country and its code (used to block cross-country routes and
 * points outside the service country).
 */
export async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });

  if (!response.ok) throw new Error("Unable to find this place");
  const data = await response.json();
  return {
    name: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    country: data.address?.country || null,
    countryCode: data.address?.country_code || null,
  };
}

/**
 * Forward-geocodes a place name via Nominatim. Used to resolve
 * share.google links, which (unlike older goo.gl/maps.app.goo.gl links)
 * redirect to a Google Search results page with a place *name* in the
 * query string rather than coordinates in the URL - so the name has to be
 * geocoded the same way a typed search-box entry would be.
 */
export async function geocodePlaceName(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1${NOMINATIM_COUNTRY_FILTER}`;
  const response = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!response.ok) throw new Error("Unable to find this place");
  const [result] = await response.json();
  if (!result) return null;
  return { latitude: Number(result.lat), longitude: Number(result.lon) };
}

/**
 * Returns an error message if setting `prefix` ("source"/"destination") to
 * this point isn't allowed, or null if it's fine:
 * - the point is outside the service country (`point` = { countryCode, latitude, longitude })
 * - or `newCountry` conflicts with the already-set opposite point's country.
 */
export function countryMismatch(form, prefix, newCountry, point) {
  const outside = point ? serviceAreaError(point) : null;
  if (outside) return outside;
  if (!newCountry) return null;
  const oppositePrefix = prefix === "source" ? "destination" : "source";
  const oppositeCountry = form.getFieldValue(`${oppositePrefix}Country`);
  if (oppositeCountry && oppositeCountry !== newCountry) {
    return `Start and end locations must be in the same country (already set to ${oppositeCountry}).`;
  }
  return null;
}

/**
 * Thins a long [lat, lng] route to at most `maxPoints`, always keeping the
 * first and last point, so it's small enough to send with the ride.
 */
export function simplifyPath(points, maxPoints = 400) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => points[Math.round(i * step)]);
}
