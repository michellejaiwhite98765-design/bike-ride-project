import L from "leaflet";

// Shared ride-map markers: a bike for the rider, a dot for the start point and
// a flag pin for the destination. Styles live in index.css (.ls-*).
const BIKE_SVG = `<svg viewBox="0 0 64 40" aria-hidden="true"><circle cx="13" cy="27" r="9"/><circle cx="51" cy="27" r="9"/><path d="M13 27 L25 11 H37 L51 27 M25 11 L32 27 H13 M37 11 L41 5 H47 M32 27 L41 11"/></svg>`;

const FLAG_PIN_SVG = `<svg viewBox="0 0 40 52" aria-hidden="true"><path class="ls-end-body" d="M20 2C10 2 3 9.5 3 18.5C3 31 20 50 20 50S37 31 37 18.5C37 9.5 30 2 20 2Z"/><circle cx="20" cy="18.5" r="12.5" fill="#fff"/><path class="ls-end-flag" d="M15.5 11.5V26" stroke-width="2.2" stroke-linecap="round" fill="none"/><path class="ls-end-flag-fill" d="M16.6 12.2H26.5L23.7 16.1L26.5 20H16.6Z"/></svg>`;

/** The rider's bike. `live` adds a pulsing ring (used while the ride is under way). */
export function bikeIcon({ live = false, size = 46 } = {}) {
  return L.divIcon({
    className: "ls-marker-wrapper",
    html: `<div class="ls-bike${live ? " ls-bike-live" : ""}" style="width:${size}px;height:${size}px">${BIKE_SVG}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Where the ride begins (shown separately from the bike once the bike has moved on). */
export function startIcon() {
  return L.divIcon({
    className: "ls-marker-wrapper",
    html: `<div class="ls-start"><span class="ls-start-dot"></span><span class="ls-start-label">Start</span></div>`,
    iconSize: [74, 24],
    iconAnchor: [12, 12],
  });
}

/** The destination: a violet pin with a flag. */
export function endIcon({ size = 40 } = {}) {
  const height = Math.round((size * 52) / 40);
  return L.divIcon({
    className: "ls-marker-wrapper",
    html: `<div class="ls-end" style="width:${size}px;height:${height}px">${FLAG_PIN_SVG}</div>`,
    iconSize: [size, height],
    iconAnchor: [size / 2, height - 2],
  });
}

/** A passenger's live position: a person badge with their initial ("You" for the viewer's own marker). */
export function passengerIcon(label = "P", { you = false } = {}) {
  const text = you ? "You" : String(label).slice(0, 1).toUpperCase();
  return L.divIcon({
    className: "ls-marker-wrapper",
    html: `<div class="ls-passenger${you ? " ls-passenger-you" : ""}">${text}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

/** Where a passenger is to be picked up. */
export function pickupPinIcon() {
  return L.divIcon({
    className: "ls-marker-wrapper",
    html: `<div class="ls-pickup"><span class="ls-pickup-dot"></span><span class="ls-pickup-label">Pickup</span></div>`,
    iconSize: [78, 24],
    iconAnchor: [11, 12],
  });
}
