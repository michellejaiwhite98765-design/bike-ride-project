import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Tooltip, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button, Segmented, Spin, Tag, message } from "antd";
import { AimOutlined, EnvironmentOutlined, FlagOutlined, LoadingOutlined, SwapOutlined } from "@ant-design/icons";
import { reverseGeocode, countryMismatch } from "../utils/geo.js";
import { COLOR_TILE_URL, COLOR_TILE_ATTRIBUTION } from "../constants/mapTiles.js";
import { useTheme } from "../context/ThemeContext.jsx";

const DEFAULT_CENTER = [8.183, 77.411];
const HOME_BLUE = "#2563eb";
const ROUTE_COLORS = ["#2563eb", "#94a3b8", "#94a3b8"];

function pinIcon(type) {
  const isStart = type === "start";
  return L.divIcon({
    className: "ride-creation-modern-pin-wrapper",
    html: `
      <div class="ride-creation-modern-pin ${isStart ? "is-start" : "is-end"}">
        <span class="ride-pin-core"></span>
      </div>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 47],
  });
}

function MapViewport({ source, destination }) {
  const map = useMap();

  useEffect(() => {
    // flyTo/flyToBounds animate by interpolating over the container's pixel
    // size, which is still 0x0 on the very first render (e.g. while the
    // Drawer it lives in is still animating open) - Leaflet's easing math
    // divides by that size and throws "Invalid LatLng (NaN, NaN)" instead
    // of just... not animating. Fall back to the instant, non-animated
    // equivalent whenever the container isn't sized yet.
    const size = map.getSize();
    const canAnimate = size.x > 0 && size.y > 0;

    const points = [source, destination].filter(Boolean);

    if (!points.length) {
      if (canAnimate) map.flyTo(DEFAULT_CENTER, 9, { duration: 0.7 });
      else map.setView(DEFAULT_CENTER, 9);
      return;
    }

    if (points.length === 1) {
      const target = [points[0].latitude, points[0].longitude];
      if (canAnimate) map.flyTo(target, 13, { duration: 0.8 });
      else map.setView(target, 13);
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    if (canAnimate) {
      map.flyToBounds(bounds, { padding: [70, 70], maxZoom: 13, duration: 0.9 });
    } else {
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 13 });
    }
  }, [map, source, destination]);

  return null;
}

function MapClickHandler({ mode, onMapLocation }) {
  useMapEvents({
    click(event) {
      onMapLocation(event.latlng, mode);
    },
  });
  return null;
}

// Requests alternative routes (not just the single fastest one) so the rider
// can pick which road their ride actually follows - OSRM returns them
// ordered fastest-first, which we treat as the default when nothing is
// explicitly chosen.
async function getRoutes(source, destination) {
  if (!source || !destination) return [];

  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&alternatives=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load route");

  const data = await response.json();
  const routes = data?.routes || [];
  return routes.map((r) => ({
    coordinates: (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
  }));
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
}

export default function RideCreationMap({ source, destination, form, onRouteSelect }) {
  const { mode: themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const [mode, setMode] = useState(source ? "destination" : "source");
  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const center = useMemo(() => {
    if (source) return [source.latitude, source.longitude];
    if (destination) return [destination.latitude, destination.longitude];
    return DEFAULT_CENTER;
  }, [source, destination]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      if (!source || !destination) {
        setRoutes([]);
        setSelectedIndex(0);
        return;
      }

      try {
        setRouteLoading(true);
        const loaded = await getRoutes(source, destination);
        if (!cancelled) {
          setRoutes(loaded);
          setSelectedIndex(0);
        }
      } catch {
        if (!cancelled) {
          setRoutes([
            {
              coordinates: [
                [source.latitude, source.longitude],
                [destination.latitude, destination.longitude],
              ],
              distanceKm: null,
              durationMin: null,
            },
          ]);
          setSelectedIndex(0);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    loadRoutes();
    return () => {
      cancelled = true;
    };
  }, [source, destination]);

  // Bubble the currently-selected route (defaulting to the first/fastest
  // one) up to the create-ride form so it can use its real driving distance.
  useEffect(() => {
    onRouteSelect?.(routes[selectedIndex] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, selectedIndex]);

  async function handleMapLocation({ lat, lng }, selectedMode) {
    if (!form) return;
    const prefix = selectedMode === "source" ? "source" : "destination";

    try {
      setMapLoading(true);
      const { name, country } = await reverseGeocode(lat, lng);

      const mismatchError = countryMismatch(form, prefix, country);
      if (mismatchError) {
        message.error(mismatchError);
        return;
      }

      form.setFieldsValue({
        [`${prefix}Name`]: name.slice(0, 150),
        [`${prefix}Latitude`]: lat,
        [`${prefix}Longitude`]: lng,
        [`${prefix}Country`]: country,
      });

      setMode(selectedMode === "source" ? "destination" : "source");
    } catch {
      // Keep the map usable even if reverse geocoding fails - country can't
      // be checked here, so this point is accepted as-is.
      form.setFieldsValue({
        [`${prefix}Name`]: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        [`${prefix}Latitude`]: lat,
        [`${prefix}Longitude`]: lng,
      });
    } finally {
      setMapLoading(false);
    }
  }

  // Draw unselected routes first so the selected one always renders on top.
  const orderedIndexes = [...routes.keys()].sort((a, b) => (a === selectedIndex ? 1 : b === selectedIndex ? -1 : 0));

  return (
    <div className="ride-creation-map-shell">
      <div className="ride-creation-map-toolbar">
        <div>
          <div className="ride-map-title">Plan your route</div>
          <div className="ride-map-subtitle">Choose a point on the map or use the location fields.</div>
        </div>
        <Tag icon={<AimOutlined />} color="blue">
          {mode === "source" ? "Set start" : "Set end"}
        </Tag>
      </div>

      <div className="ride-map-control">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: "Start", value: "source", icon: <EnvironmentOutlined /> },
            { label: "End", value: "destination", icon: <FlagOutlined /> },
          ]}
        />
        <Button
          size="small"
          type="text"
          icon={<SwapOutlined />}
          onClick={() => setMode((current) => current === "source" ? "destination" : "source")}
        >
          Switch
        </Button>
      </div>

      <div className="ride-creation-map">
        <MapContainer
          center={center}
          zoom={10}
          scrollWheelZoom
          zoomAnimation
          zoomAnimationThreshold={4}
          wheelDebounce={35}
          wheelPxPerZoomLevel={90}
          touchZoom
          doubleClickZoom
          dragging
          style={{ height: "100%", width: "100%" }}
          className={isDark ? "rcm-dark-tiles" : ""}
        >
          <TileLayer attribution={COLOR_TILE_ATTRIBUTION} url={COLOR_TILE_URL} />

          <MapViewport source={source} destination={destination} />
          <MapClickHandler mode={mode} onMapLocation={handleMapLocation} />

          {source && (
            <Marker
              position={[source.latitude, source.longitude]}
              icon={pinIcon("start")}
              eventHandlers={{ click: () => setMode("source") }}
            >
              <Tooltip direction="top" offset={[0, -44]} opacity={1}>
                <strong>Start:</strong> {source.name || `${source.latitude.toFixed(5)}, ${source.longitude.toFixed(5)}`}
              </Tooltip>
            </Marker>
          )}

          {destination && (
            <Marker
              position={[destination.latitude, destination.longitude]}
              icon={pinIcon("end")}
              eventHandlers={{ click: () => setMode("destination") }}
            >
              <Tooltip direction="top" offset={[0, -44]} opacity={1}>
                <strong>End:</strong> {destination.name || `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`}
              </Tooltip>
            </Marker>
          )}

          {orderedIndexes.map((i) => {
            const route = routes[i];
            const isSelected = i === selectedIndex;
            if (route.coordinates.length < 2) return null;
            return (
              <div key={i}>
                <Polyline
                  positions={route.coordinates}
                  pathOptions={{
                    color: "#ffffff",
                    weight: isSelected ? 8 : 5,
                    opacity: isSelected ? 0.9 : 0.5,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{ click: () => setSelectedIndex(i) }}
                >
                  <Tooltip sticky opacity={1}>
                    <strong>{i === 0 ? "Fastest route" : `Alternative ${i}`}</strong>
                    <br />
                    {route.distanceKm != null ? `${route.distanceKm.toFixed(1)} km` : "—"} · {formatDuration(route.durationMin)}
                  </Tooltip>
                </Polyline>
                <Polyline
                  positions={route.coordinates}
                  pathOptions={{
                    color: isSelected ? HOME_BLUE : ROUTE_COLORS[Math.min(i, ROUTE_COLORS.length - 1)],
                    weight: isSelected ? 5 : 3,
                    opacity: isSelected ? 0.95 : 0.7,
                    dashArray: isSelected ? undefined : "2 8",
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{ click: () => setSelectedIndex(i) }}
                />
              </div>
            );
          })}
        </MapContainer>

        {mapLoading && (
          <div className="ride-map-loading">
            <Spin indicator={<LoadingOutlined spin />} />
            <span>Finding this place…</span>
          </div>
        )}

        {!source && !destination && (
          <div className="ride-creation-map-empty">
            <div className="map-empty-icon"><AimOutlined /></div>
            <strong>Start by choosing a location</strong>
            <span>Click anywhere on the map to set your start point.</span>
          </div>
        )}

        {routes.length > 1 && (
          <div className="ride-map-route-options">
            {routes.map((route, i) => (
              <button
                key={i}
                type="button"
                className={i === selectedIndex ? "active" : ""}
                onClick={() => setSelectedIndex(i)}
              >
                <span className="route-name">{i === 0 ? "Fastest route" : `Alternative ${i}`}</span>
                <span className="route-meta">
                  {route.distanceKm != null ? `${route.distanceKm.toFixed(1)} km` : "—"} · {formatDuration(route.durationMin)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="ride-creation-map-legend">
          <span><i className="legend-dot start" /> Start</span>
          <span><i className="legend-dot end" /> End</span>
          {routeLoading && <span className="route-status"><LoadingOutlined spin /> Building route…</span>}
        </div>
      </div>
    </div>
  );
}
