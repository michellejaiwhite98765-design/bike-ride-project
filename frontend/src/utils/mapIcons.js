// Small, clean outline SVG glyphs for Leaflet divIcon markers - thin
// stroke-based icons (not solid/filled, not emoji) so they read as a
// consistent, modern icon set against the badge backgrounds instead of
// clashing platform emoji glyphs.

export const PERSON_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>';

export const CAR_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16h14M5 16l1.4-4.8A2 2 0 018.3 10h7.4a2 2 0 011.9 1.2L19 16M5 16v2.5M19 16v2.5"/><circle cx="8" cy="17.7" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="17.7" r="1.3" fill="currentColor" stroke="none"/></svg>';

export const BICYCLE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.1"/><circle cx="18.5" cy="17.5" r="3.1"/><path d="M5.5 17.5L9.5 8h3.5l4.5 9.5M9.5 8L8 12h6.5"/></svg>';

export const SCOOTER_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17.5" r="2.7"/><circle cx="18" cy="17.5" r="2.7"/><path d="M5 17.5h4l2.5-5h4l2.5 5M9 12.5L7.5 9h3"/></svg>';

export const BUS_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="10" rx="2"/><path d="M4 11h16M8 15v2M16 15v2"/><circle cx="7.5" cy="18.3" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="18.3" r="1" fill="currentColor" stroke="none"/></svg>';

export const SHOPPING_BAG_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 8h11l1 12a1 1 0 01-1 1H6.5a1 1 0 01-1-1l1-12z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg>';

export const AIRPLANE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10.5 13.5M21 3l-6.5 18-3-8-8-3L21 3z"/></svg>';

export const TRAIN_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="13" rx="4"/><path d="M6 11h12M9 16l-2 3M15 16l2 3"/><circle cx="9" cy="13.3" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13.3" r="1" fill="currentColor" stroke="none"/></svg>';

export const HOSPITAL_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

export const BANK_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l8-5 8 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>';

export const FUEL_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="9" height="16" rx="1.5"/><path d="M4 10h9M7 7h3M13 8l4 2v7a1.5 1.5 0 003 0v-5l-2-2"/></svg>';

export const PARK_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l4 6h-2.5l3.5 5h-3v6h-4v-6h-3l3.5-5H8l4-6z"/></svg>';

export const RESTAURANT_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v6a2 2 0 002 2v12M6 2v5M8 2v5M10 2v5M18 2c-2 0-3 2-3 5s1 4 3 4v11"/></svg>';

export function vehicleIconSvg(vehicleType) {
  if (vehicleType === "CAR") return CAR_ICON_SVG;
  if (vehicleType === "BICYCLE") return BICYCLE_ICON_SVG;
  return SCOOTER_ICON_SVG; // MOTORCYCLE, SCOOTER
}
