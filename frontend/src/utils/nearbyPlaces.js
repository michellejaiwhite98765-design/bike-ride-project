import { haversineKm } from "./geo.js";
import {
  AIRPLANE_ICON_SVG,
  BANK_ICON_SVG,
  BUS_ICON_SVG,
  FUEL_ICON_SVG,
  HOSPITAL_ICON_SVG,
  PARK_ICON_SVG,
  RESTAURANT_ICON_SVG,
  SHOPPING_BAG_ICON_SVG,
  TRAIN_ICON_SVG,
} from "./mapIcons.js";

// Nearby "busy places" pulled live from OpenStreetMap's Overpass API (free,
// no key). Each category lists a few alternative OSM tags (e.g. a bus stand
// might only be tagged as a plain "bus_stop", not the stricter
// "bus_station") since real-world tagging is inconsistent, especially
// outside major cities - this keeps the odds of finding at least one nearby
// match per category high without showing fake/made-up places.
export const NEARBY_PLACE_QUERIES = [
  { key: "bus", label: "Bus Stand", tags: [["amenity", "bus_station"], ["highway", "bus_stop"]], radius: 4000, icon: BUS_ICON_SVG, color: "#F59E0B" },
  { key: "railway_station", label: "Railway Station", tags: [["railway", "station"]], radius: 8000, icon: TRAIN_ICON_SVG, color: "#10B981" },
  { key: "aerodrome", label: "Airport", tags: [["aeroway", "aerodrome"]], radius: 30000, icon: AIRPLANE_ICON_SVG, color: "#3B82F6" },
  { key: "mall", label: "Mall", tags: [["shop", "mall"], ["shop", "supermarket"]], radius: 6000, icon: SHOPPING_BAG_ICON_SVG, color: "#A855F7" },
  { key: "hospital", label: "Hospital", tags: [["amenity", "hospital"], ["amenity", "clinic"]], radius: 6000, icon: HOSPITAL_ICON_SVG, color: "#EF4444" },
  { key: "bank", label: "Bank", tags: [["amenity", "bank"], ["amenity", "atm"]], radius: 6000, icon: BANK_ICON_SVG, color: "#EAB308" },
  { key: "fuel", label: "Fuel Station", tags: [["amenity", "fuel"]], radius: 6000, icon: FUEL_ICON_SVG, color: "#F97316" },
  { key: "park", label: "Park", tags: [["leisure", "park"], ["leisure", "garden"]], radius: 6000, icon: PARK_ICON_SVG, color: "#84CC16" },
  { key: "restaurant", label: "Restaurant", tags: [["amenity", "restaurant"], ["amenity", "fast_food"], ["amenity", "cafe"]], radius: 5000, icon: RESTAURANT_ICON_SVG, color: "#FB7185" },
];
export const MAX_PLACES_PER_CATEGORY = 1;

export async function fetchNearbyPlaces(lat, lng) {
  const clauses = NEARBY_PLACE_QUERIES.flatMap((category) =>
    category.tags.map(([key, value]) => `node["${key}"="${value}"](around:${category.radius},${lat},${lng});`)
  ).join("\n");
  const query = `[out:json][timeout:20];(${clauses});out center 40;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) throw new Error("Overpass unavailable");
  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const byCategory = NEARBY_PLACE_QUERIES.map((category) => ({
    ...category,
    places: elements
      .filter((el) => category.tags.some(([key, value]) => el.tags?.[key] === value))
      .map((el) => ({
        id: el.id,
        name: el.tags?.name || category.label,
        lat: el.lat,
        lng: el.lon,
        distanceKm: haversineKm(lat, lng, el.lat, el.lon),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_PLACES_PER_CATEGORY)
      .map((p) => ({ ...p, color: category.color, icon: category.icon, category: category.label })),
  }));

  return byCategory.flatMap((c) => c.places);
}
