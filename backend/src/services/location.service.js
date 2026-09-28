import { ApiError } from "../utils/ApiError.js";

// Google's shared-location links (Maps app share sheet, WhatsApp-forwarded
// locations) come back as short links that redirect to the real
// https://www.google.com/maps/... URL containing the coordinates. Browsers
// can't read the final URL of a cross-origin redirect (CORS), so this
// follows it server-side instead. Restricted to a known allowlist of
// Google hostnames only - this is an outbound-fetch endpoint, so anything
// broader would let a caller use it to probe/hit arbitrary internal or
// third-party URLs (SSRF) from our server's IP.
const ALLOWED_HOSTNAMES = [
  "goo.gl",
  "maps.app.goo.gl",
  "share.google",
  "g.co",
  "google.com",
  "www.google.com",
  "maps.google.com",
];

const FETCH_TIMEOUT_MS = 5000;

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTNAMES.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export const locationService = {
  async resolveSharedLink(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw ApiError.badRequest("Invalid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol) || !isAllowedHost(parsed.hostname)) {
      throw ApiError.badRequest("Only Google Maps / shared-location links can be resolved");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BikeRideLinkResolver/1.0)" },
      });
      // We only need the final redirected URL, not the page body.
      response.body?.cancel?.().catch(() => {});
      return { resolvedUrl: response.url };
    } catch (error) {
      if (error.name === "AbortError") throw ApiError.badRequest("Timed out resolving that link");
      throw ApiError.badRequest("Could not resolve that link");
    } finally {
      clearTimeout(timer);
    }
  },
};
