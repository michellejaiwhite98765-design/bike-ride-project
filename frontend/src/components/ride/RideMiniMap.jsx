import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import { ClockCircleOutlined, RiseOutlined } from "@ant-design/icons";
import { haversineKm } from "../../utils/geo.js";

const LIGHT_TILE_BASE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LIGHT_TILE_REFERENCE_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

function pinIcon(type) {
  const isStart = type === "start";
  return L.divIcon({
    className: "rmm-pin-wrapper",
    html: `<span class="rmm-pin ${isStart ? "rmm-pin-start" : "rmm-pin-end"}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

async function getRoute(source, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=simplified&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load route");
  const data = await response.json();
  const leg = data?.routes?.[0];
  const coordinates = leg?.geometry?.coordinates || [];
  return {
    points: coordinates.map(([longitude, latitude]) => [latitude, longitude]),
    distanceKm: leg?.distance != null ? leg.distance / 1000 : null,
    durationMin: leg?.duration != null ? leg.duration / 60 : null,
  };
}

/**
 * Small, non-interactive route preview used inside ride cards — just the
 * start/end pins and a distance + real (OSRM) drive-time chip. Falls back to
 * a straight line + haversine distance if the route API is unreachable, and
 * only shows a minutes figure when a value was actually available (never a
 * fabricated estimate).
 */
export default function RideMiniMap({ ride }) {
  const [route, setRoute] = useState({ points: [], distanceKm: null, durationMin: null });

  const source = useMemo(
    () => ({ latitude: Number(ride.sourceLatitude), longitude: Number(ride.sourceLongitude) }),
    [ride.sourceLatitude, ride.sourceLongitude]
  );
  const destination = useMemo(
    () => ({ latitude: Number(ride.destinationLatitude), longitude: Number(ride.destinationLongitude) }),
    [ride.destinationLatitude, ride.destinationLongitude]
  );

  const hasCoords = [source.latitude, source.longitude, destination.latitude, destination.longitude].every(Number.isFinite);

  useEffect(() => {
    if (!hasCoords) return undefined;
    let cancelled = false;

    getRoute(source, destination)
      .then((result) => {
        if (!cancelled) setRoute(result);
      })
      .catch(() => {
        if (cancelled) return;
        setRoute({
          points: [[source.latitude, source.longitude], [destination.latitude, destination.longitude]],
          distanceKm: haversineKm(source.latitude, source.longitude, destination.latitude, destination.longitude),
          durationMin: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [hasCoords, source, destination]);

  if (!hasCoords) return null;

  const center = [(source.latitude + destination.latitude) / 2, (source.longitude + destination.longitude) / 2];

  return (
    <div className="rmm-shell">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        tap={false}
      >
        <TileLayer url={LIGHT_TILE_BASE_URL} />
        <TileLayer url={LIGHT_TILE_REFERENCE_URL} />

        <Marker position={[source.latitude, source.longitude]} icon={pinIcon("start")} />
        <Marker position={[destination.latitude, destination.longitude]} icon={pinIcon("end")} />

        {route.points.length > 1 && (
          <Polyline
            positions={route.points}
            pathOptions={{ color: "#0f766e", weight: 3, opacity: 0.85, lineCap: "round", lineJoin: "round", dashArray: "1 8" }}
          />
        )}
      </MapContainer>

      <div className="rmm-chips">
        {route.distanceKm != null && (
          <span className="rmm-chip">
            <RiseOutlined /> {route.distanceKm.toFixed(1)} km
          </span>
        )}
        {route.durationMin != null && (
          <span className="rmm-chip">
            <ClockCircleOutlined /> {Math.max(1, Math.round(route.durationMin))} min
          </span>
        )}
      </div>

      <style>{`
        .rmm-shell{position:relative;height:110px;border-radius:12px;overflow:hidden;pointer-events:none;border:1px solid #e2e8f0}
        .rmm-shell .leaflet-container{background:#eef2f7}
        .rmm-pin-wrapper{background:transparent!important;border:0!important}
        .rmm-pin{display:block;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.4)}
        .rmm-pin-start{background:#2563eb}
        .rmm-pin-end{background:#0f766e}
        .rmm-chips{position:absolute;left:8px;bottom:8px;z-index:500;display:flex;gap:6px}
        .rmm-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid #e2e8f0;color:#0f172a;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.08)}
      `}</style>
    </div>
  );
}
