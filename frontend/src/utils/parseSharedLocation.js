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
// Short links (goo.gl, maps.app.goo.gl, share.google, g.co) redirect to one
// of the above - the browser can't read the final URL of a cross-origin
// redirect itself (CORS), so resolveSharedLocationLink() below asks the
// backend to follow the redirect server-side first.

const COORD_PAIR = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
const SHORT_LINK_HOSTS = ["goo.gl", "maps.app.goo.gl", "share.google", "g.co"];

export function isGoogleLocationLink(input) {
  try {
    const url = new URL(String(input || "").trim());
    const host = url.hostname.toLowerCase();
    return host.includes("google.") || SHORT_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function isShortLink(input) {
  try {
    const url = new URL(String(input || "").trim());
    const host = url.hostname.toLowerCase();
    return SHORT_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function parseSharedLocationLink(input) {
  const text = String(input || "").trim();
  if (!text || !isGoogleLocationLink(text)) return null;

  const url = new URL(text);

  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };
  }

  // A maps.app.goo.gl short link for a dropped pin (rather than a named
  // place) commonly resolves to .../maps/search/<lat>,+<lng> instead of a
  // /maps/place/.../@lat,lng,zoom URL - no "@" segment and no q= param, just
  // the coordinate pair as the path itself (with the space before the
  // longitude written as a literal "+").
  const searchPathMatch = url.pathname.match(/\/maps\/search\/(-?\d+(?:\.\d+)?),\+?\s*(-?\d+(?:\.\d+)?)/);
  if (searchPathMatch) {
    return { latitude: Number(searchPathMatch[1]), longitude: Number(searchPathMatch[2]) };
  }

  for (const param of ["q", "query"]) {
    const value = url.searchParams.get(param);
    const match = value && value.match(COORD_PAIR);
    if (match) {
      return { latitude: Number(match[1]), longitude: Number(match[2]) };
    }
  }

  // share.google links resolve to a Google Search results page
  // (google.com/search?q=map+of+<place name>) rather than a /maps/ URL, so
  // there's no coordinate to read from the URL at all - only a place name,
  // which the caller has to geocode itself (see resolveSharedLocationLink).
  if (url.pathname === "/search") {
    const q = url.searchParams.get("q");
    if (q) {
      const placeName = q.replace(/^map of /i, "").trim();
      if (placeName) return { searchQuery: placeName };
    }
  }

  return null;
}

// Full pipeline: resolves short links via the backend (following the
// redirect server-side) before parsing, and parses full links directly
// without a network round-trip. Geocodes a place name if that's all the
// resolved link yielded (see the share.google case above). Returns null if
// the input isn't a recognizable Google Maps / shared-location link, or a
// point couldn't be found even after resolving/geocoding it.
export async function resolveSharedLocationLink(input, resolveLinkFn, geocodeFn) {
  const text = String(input || "").trim();
  if (!isGoogleLocationLink(text)) return null;

  const parsed = isShortLink(text)
    ? parseSharedLocationLink((await resolveLinkFn(text)).resolvedUrl)
    : parseSharedLocationLink(text);

  if (!parsed) return null;
  if ("searchQuery" in parsed) return geocodeFn(parsed.searchQuery);
  return parsed;
}
