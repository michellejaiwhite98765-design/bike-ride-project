import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button, Segmented, Spin, Tag } from "antd";
import { AimOutlined, EnvironmentOutlined, FlagOutlined, LoadingOutlined, SwapOutlined } from "@ant-design/icons";

const DEFAULT_CENTER = [8.183, 77.411];
const HOME_BLUE = "#2563eb";
const HOME_INDIGO = "#6366f1";

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
    const points = [source, destination].filter(Boolean);

    if (!points.length) {
      map.flyTo(DEFAULT_CENTER, 9, { duration: 0.7 });
      return;
    }

    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 13, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.flyToBounds(bounds, {
      padding: [70, 70],
      maxZoom: 13,
      duration: 0.9,
    });
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

async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });

  if (!response.ok) throw new Error("Unable to find this place");
  const data = await response.json();
  return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

async function getRoute(source, destination) {
  if (!source || !destination) return [];

  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load route");

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];
  return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}

export default function RideCreationMap({ source, destination, form }) {
  const [mode, setMode] = useState(source ? "destination" : "source");
  const [route, setRoute] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const center = useMemo(() => {
    if (source) return [source.latitude, source.longitude];
    if (destination) return [destination.latitude, destination.longitude];
    return DEFAULT_CENTER;
  }, [source, destination]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (!source || !destination) {
        setRoute([]);
        return;
      }

      try {
        setRouteLoading(true);
        const points = await getRoute(source, destination);
        if (!cancelled) setRoute(points);
      } catch {
        if (!cancelled) {
          setRoute([
            [source.latitude, source.longitude],
            [destination.latitude, destination.longitude],
          ]);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [source, destination]);

  async function handleMapLocation({ lat, lng }, selectedMode) {
    if (!form) return;

    try {
      setMapLoading(true);
      const placeName = await reverseGeocode(lat, lng);
      const prefix = selectedMode === "source" ? "source" : "destination";

      form.setFieldsValue({
        [`${prefix}Name`]: placeName.slice(0, 150),
        [`${prefix}Latitude`]: lat,
        [`${prefix}Longitude`]: lng,
      });

      setMode(selectedMode === "source" ? "destination" : "source");
    } catch {
      // Keep the map usable even if reverse geocoding fails.
      const prefix = selectedMode === "source" ? "source" : "destination";
      form.setFieldsValue({
        [`${prefix}Name`]: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        [`${prefix}Latitude`]: lat,
        [`${prefix}Longitude`]: lng,
      });
    } finally {
      setMapLoading(false);
    }
  }

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
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewport source={source} destination={destination} />
          <MapClickHandler mode={mode} onMapLocation={handleMapLocation} />

          {source && (
            <Marker
              position={[source.latitude, source.longitude]}
              icon={pinIcon("start")}
              eventHandlers={{ click: () => setMode("source") }}
            />
          )}

          {destination && (
            <Marker
              position={[destination.latitude, destination.longitude]}
              icon={pinIcon("end")}
              eventHandlers={{ click: () => setMode("destination") }}
            />
          )}

          {route.length > 1 && (
            <>
              <Polyline
                positions={route}
                pathOptions={{
                  color: "#ffffff",
                  weight: 8,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <Polyline
                positions={route}
                pathOptions={{
                  color: HOME_BLUE,
                  weight: 5,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          )}
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

        <div className="ride-creation-map-legend">
          <span><i className="legend-dot start" /> Start</span>
          <span><i className="legend-dot end" /> End</span>
          {routeLoading && <span className="route-status"><LoadingOutlined spin /> Building route…</span>}
        </div>
      </div>
    </div>
  );
}
