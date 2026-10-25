// Shared geo helpers used by the ride details page (distance display) and the
// ride creation map/location tools (reverse geocoding, current-location fill,
// shared-link parsing) - factored out so there's one implementation instead
// of copies drifting apart.

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reverse-geocodes a point via Nominatim, returning both a display name and
 * the resolved country (used to block cross-country routes).
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
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
  const response = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!response.ok) throw new Error("Unable to find this place");
  const [result] = await response.json();
  if (!result) return null;
  return { latitude: Number(result.lat), longitude: Number(result.lon) };
}

/**
 * Returns an error message if setting `prefix` ("source"/"destination") to
 * `newCountry` would conflict with the already-set opposite point's country,
 * or null if it's fine (either point not yet resolved, or countries match).
 */
export function countryMismatch(form, prefix, newCountry) {
  if (!newCountry) return null;
  const oppositePrefix = prefix === "source" ? "destination" : "source";
  const oppositeCountry = form.getFieldValue(`${oppositePrefix}Country`);
  if (oppositeCountry && oppositeCountry !== newCountry) {
    return `Start and end locations must be in the same country (already set to ${oppositeCountry}).`;
  }
  return null;
}
