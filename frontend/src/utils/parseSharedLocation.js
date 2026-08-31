// Extracts a lat/lng point out of a Google Maps URL. WhatsApp "shared
// location" links are themselves Google Maps links, so this one parser
// covers both cases mentioned by the user (Google Maps + WhatsApp).
//
// Handles the common full-URL shapes:
//   https://www.google.com/maps/@13.08,80.27,15z
//   https://www.google.com/maps/place/Some+Place/@13.08,80.27,15z/...
//   https://maps.google.com/?q=13.08,80.27
//   https://www.google.com/maps?query=13.08,80.27
//
// Deliberately does NOT try to resolve maps.app.goo.gl short links - that
// redirect can't be followed from the browser (CORS), so isShortLink() lets
// callers show a clearer error instead of a generic parse failure.

const COORD_PAIR = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;

export function isShortLink(input) {
  try {
    const url = new URL(String(input || "").trim());
    return url.hostname.toLowerCase().includes("goo.gl");
  } catch {
    return false;
  }
}

export function parseSharedLocationLink(input) {
  const text = String(input || "").trim();
  if (!text) return null;

  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("google.") && !host.includes("goo.gl")) return null;

  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };
  }

  for (const param of ["q", "query"]) {
    const value = url.searchParams.get(param);
    const match = value && value.match(COORD_PAIR);
    if (match) {
      return { latitude: Number(match[1]), longitude: Number(match[2]) };
    }
  }

  return null;
}
