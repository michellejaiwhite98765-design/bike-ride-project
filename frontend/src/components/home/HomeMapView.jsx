import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import JoinRideButton from "../ride/JoinRideButton.jsx";
import { MapContainer, TileLayer, Marker, Polyline, Popup, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { AimOutlined, ArrowRightOutlined, TeamOutlined } from "@ant-design/icons";
import { COLOR_TILE_URL, COLOR_TILE_ATTRIBUTION, DARK_TILE_FILTER } from "../../constants/mapTiles.js";
import { PERSON_ICON_SVG } from "../../utils/mapIcons.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const DEFAULT_CENTER = [9.9252, 78.1198]; // Madurai fallback, same as the rest of the app.
const ZOOM = 14;

// The palette for trips drawn on the map (route + its two pins): at most 10
// colors, handed out in a random order each time the map loads, then reused
// if there are more than 10 trips.
const TRIP_COLORS = [
  "#2563eb",
  "#f97316",
  "#db2777",
  "#16a34a",
  "#9333ea",
  "#eab308",
  "#0891b2",
  "#dc2626",
  "#65a30d",
  "#92400e",
];

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getRoute(source, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load route");
  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];
  return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}

function meIcon() {
  return L.divIcon({
    className: "hmv-marker-wrap",
    html: `<div class="hmv-me"><div class="hmv-me-ring"></div><div class="hmv-me-dot">${PERSON_ICON_SVG}</div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function priceIcon(ride, color) {
  const isFull = ride.availableSeats <= 0;
  const isFree = ride.rideType === "WITHOUT_TIP";
  const label = isFull ? "Full" : isFree ? "Free" : `₹${ride.tipAmount}`;
  return L.divIcon({
    className: "hmv-marker-wrap",
    html: `<div class="hmv-price-pin${isFull ? " hmv-price-pin-full" : ""}" style="--pin-color:${color}"><span>${label}</span><i></i></div>`,
    iconSize: [70, 40],
    iconAnchor: [35, 40],
  });
}

function endPinIcon(color) {
  return L.divIcon({
    className: "hmv-marker-wrap",
    html: `<div class="hmv-end-pin" style="--pin-color:${color}"><span class="hmv-end-pin-core"></span></div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 28],
  });
}

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try {
      if (points.length === 1) {
        map.setView(points[0], ZOOM);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
      }
    } catch {
      // Map may already be mid-teardown.
    }
  }, [map, points]);
  return null;
}

// Leaflet caches its container size at init time and never re-measures on
// its own, so a browser resize or orientation change leaves the map frozen
// at its old pixel size with tiles only loaded for that old area. Watch the
// container directly (rather than window resize) since it also covers the
// tab switch and sidebar/drawer-driven layout changes.
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// Flies back to the visitor's own location whenever `signal` changes (bumped
// by the locate-me FAB) - kept separate from FitToMarkers so it only runs on
// an explicit user action, not on every markers update.
function RecenterOnSignal({ target, signal }) {
  const map = useMap();
  useEffect(() => {
    if (!target || signal === 0) return;
    try {
      map.flyTo(target, 15, { duration: 0.8 });
    } catch {
      // Map may already be mid-teardown.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
  return null;
}

/**
 * Full-screen, Google-Maps-style view of nearby rides: colorful basemap,
 * price-bubble pins and a locate-me button. `emptyState` optionally renders
 * a message card when there are no rides (used by the search page; the home
 * page shows nothing).
 */
export default function HomeMapView({ userLocation, nearbyRides, loading, emptyState, pickup, drop }) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [routesById, setRoutesById] = useState({});

  // Random color order, fixed for this map's lifetime; each ride keeps the
  // color it was first given even when the list re-sorts or filters.
  const palette = useMemo(() => shuffled(TRIP_COLORS), []);
  const colorByRide = useRef(new Map());
  const tripColor = (rideId) => {
    const assigned = colorByRide.current;
    if (!assigned.has(rideId)) assigned.set(rideId, palette[assigned.size % palette.length]);
    return assigned.get(rideId);
  };

  const ridePoints = useMemo(
    () =>
      nearbyRides
        .map((ride) => ({
          ride,
          source: { latitude: Number(ride.sourceLatitude), longitude: Number(ride.sourceLongitude) },
          destination: { latitude: Number(ride.destinationLatitude), longitude: Number(ride.destinationLongitude) },
        }))
        .filter(
          (p) =>
            Number.isFinite(p.source.latitude) &&
            Number.isFinite(p.source.longitude) &&
            Number.isFinite(p.destination.latitude) &&
            Number.isFinite(p.destination.longitude)
        ),
    [nearbyRides]
  );

  // Fetch the real driving route for each trip so it draws as an actual road
  // path rather than a straight line. Skips trips whose route is already
  // loaded, so this only re-fetches when the ride list itself changes.
  useEffect(() => {
    let cancelled = false;
    ridePoints.forEach(({ ride, source, destination }) => {
      if (routesById[ride.id]) return;
      getRoute(source, destination)
        .then((points) => {
          if (cancelled || points.length < 2) return;
          setRoutesById((prev) => ({ ...prev, [ride.id]: points }));
        })
        .catch(() => {
          // Leave it unset - the render falls back to a straight line.
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ridePoints]);

  const center = userLocation ? [userLocation.latitude, userLocation.longitude] : DEFAULT_CENTER;
  const fitPoints = useMemo(() => {
    const points = ridePoints.flatMap((p) => [
      [p.source.latitude, p.source.longitude],
      [p.destination.latitude, p.destination.longitude],
    ]);
    if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);
    return points;
  }, [ridePoints, userLocation]);

  const nearest = nearbyRides[0];

  return (
    <div className="hmv-shell">
      <MapContainer
        center={center}
        zoom={ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        className={isDark ? "hmv-dark-tiles" : ""}
      >
        <TileLayer attribution={COLOR_TILE_ATTRIBUTION} url={COLOR_TILE_URL} />
        <ZoomControl position="bottomright" />
        <InvalidateOnResize />
        <FitToMarkers points={fitPoints} />
        {userLocation && (
          <RecenterOnSignal target={[userLocation.latitude, userLocation.longitude]} signal={recenterSignal} />
        )}

        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={meIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {ridePoints.map(({ ride, source, destination }) => {
          const color = tripColor(ride.id);
          const routePoints = routesById[ride.id];
          const linePoints =
            routePoints || [
              [source.latitude, source.longitude],
              [destination.latitude, destination.longitude],
            ];
          return (
            <Polyline
              key={`route-${ride.id}`}
              positions={linePoints}
              pathOptions={{
                color,
                weight: 4,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
                dashArray: routePoints ? undefined : "1 8",
              }}
            />
          );
        })}

        {ridePoints.map(({ ride, source }) => (
          <Marker key={ride.id} position={[source.latitude, source.longitude]} icon={priceIcon(ride, tripColor(ride.id))}>
            <Popup>
              <div className="hmv-popup">
                <strong>
                  {ride.sourceName?.split(",")[0]} <ArrowRightOutlined /> {ride.destinationName?.split(",")[0]}
                </strong>
                <div className="hmv-popup-meta">
                  <span>{ride.rideType === "WITHOUT_TIP" ? "Free" : `₹${ride.tipAmount}`}</span>
                  <span>
                    <TeamOutlined /> {ride.availableSeats} left
                  </span>
                </div>
                {ride.pickupZone?.zone === "DETOUR" && (
                  <span className="hmv-popup-zone">Detour pickup · +₹{ride.pickupZone.extraTip}</span>
                )}
                <JoinRideButton ride={ride} pickup={pickup} drop={drop} size="small" block />
                <Link to={`/rides/${ride.id}`}>View ride</Link>
              </div>
            </Popup>
          </Marker>
        ))}

        {ridePoints.map(({ ride, destination }) => (
          <Marker
            key={`end-${ride.id}`}
            position={[destination.latitude, destination.longitude]}
            icon={endPinIcon(tripColor(ride.id))}
          >
            <Popup>
              <div className="hmv-popup">
                <strong>{ride.destinationName?.split(",")[0]}</strong>
                <span className="hmv-popup-meta">Drop-off point</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="hmv-top-shade" />

      {loading && <div className="hmv-loading-pill">Finding rides near you…</div>}

      <button
        type="button"
        className="hmv-locate-btn"
        onClick={() => setRecenterSignal((s) => s + 1)}
        aria-label="Recenter on my location"
      >
        <AimOutlined />
      </button>

      {/* Only pages that pass their own empty-state card (e.g. search) get a bottom bar. */}
      {!nearest && !loading && emptyState !== undefined ? emptyState : null}

      <style>{`
        .hmv-shell{position:absolute;inset:0}
        .hmv-shell .leaflet-container{background:var(--map-fallback-bg);font-family:inherit;height:100%;width:100%}
        .hmv-dark-tiles .leaflet-tile-pane{filter:${DARK_TILE_FILTER}}

        .hmv-marker-wrap{background:transparent!important;border:0!important}
        .hmv-me{position:relative;width:26px;height:26px;display:grid;place-items:center}
        .hmv-me-dot{position:relative;z-index:1;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff}
        .hmv-me-ring{position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.35);animation:hmvPulse 1.8s infinite}
        @keyframes hmvPulse{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.2);opacity:0}}

        .hmv-price-pin{position:relative;background:#fff;color:#0f172a;font-size:12px;font-weight:700;padding:6px 10px 6px 13px;border-radius:10px;border-left:4px solid var(--pin-color,#2563eb);box-shadow:0 3px 10px rgba(0,0,0,.3);white-space:nowrap;text-align:center}
        .hmv-price-pin i{position:absolute;left:50%;bottom:-5px;transform:translateX(-50%) rotate(45deg);width:9px;height:9px;background:#fff;box-shadow:2px 2px 4px rgba(0,0,0,.12)}

        .hmv-end-pin{width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--pin-color,#0f766e);border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);display:grid;place-items:center}
        .hmv-end-pin-core{width:6px;height:6px;border-radius:50%;background:#fff;transform:rotate(45deg)}

        .hmv-popup{min-width:160px;display:flex;flex-direction:column;gap:4px}
        .hmv-popup strong{font-size:13px;color:#0f172a}
        .hmv-popup-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#475569}
        .hmv-popup-zone{font-size:11px;font-weight:700;color:#b45309}
        .hmv-popup .jrb{margin-top:4px}
        .hmv-popup a{font-size:12px;font-weight:700;color:#0f766e;margin-top:2px}

        .hmv-top-shade{position:absolute;top:0;left:0;right:0;height:150px;background:linear-gradient(var(--map-top-shade),transparent);pointer-events:none;z-index:400}

        .hmv-loading-pill{position:absolute;top:160px;left:50%;transform:translateX(-50%);background:#fff;color:#0f172a;font-size:12px;font-weight:600;padding:6px 14px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:500}

        .hmv-locate-btn{position:absolute;right:14px;bottom:108px;width:40px;height:40px;border-radius:50%;background:#fff;border:0;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:17px;color:#0f172a;cursor:pointer;z-index:500}
        .hmv-locate-btn:hover{color:#0f766e}

      `}</style>
    </div>
  );
}
