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

// A fallback to an area-level result farther than this from the clicked point
// is treated as "no place here" (see reverseGeocode).
const AREA_FALLBACK_MAX_KM = 3;

export class UnknownLocationError extends Error {
  constructor() {
    super("Unknown location");
    this.name = "UnknownLocationError";
  }
}

export const UNKNOWN_LOCATION_MESSAGE = "Unknown location - this looks like the sea or an empty area. Please pick a place on land.";

/**
 * Reverse-geocodes a point via Nominatim, returning both a display name and
 * the resolved country (used to block cross-country routes).
 */
export async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });

  if (!response.ok) throw new Error("Unable to look up this place");
  const data = await response.json();
  // Nominatim answers 200 with { error: "Unable to geocode" } for points with
  // no known place (open water, empty wilderness...) - treat that as unknown.
  if (data.error || !data.display_name) throw new UnknownLocationError();
  // Near the coast Nominatim doesn't fail for the sea - it falls back to the
  // nearest administrative area (a county, city, state...) whose own point can
  // be tens of km away. A real address (road, building, landuse...) always
  // sits right at the clicked spot, so a distant area-level hit means there's
  // nothing here.
  if (data.class === "place" || data.class === "boundary") {
    const resultLat = Number(data.lat);
    const resultLon = Number(data.lon);
    if (
      Number.isFinite(resultLat) &&
      Number.isFinite(resultLon) &&
      haversineKm(Number(latitude), Number(longitude), resultLat, resultLon) > AREA_FALLBACK_MAX_KM
    ) {
      throw new UnknownLocationError();
    }
  }
  return {
    name: data.display_name,
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
