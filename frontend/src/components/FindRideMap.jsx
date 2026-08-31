import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [10.25, 77.45];
const DEFAULT_ZOOM = 7.2;

const pinIcon = (type) =>
  L.divIcon({
    className: "br-findride-marker-wrap",
    html: `<div class="br-findride-marker ${type}"><span></span></div>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  });

const rideIcon = () =>
  L.divIcon({
    className: "br-findride-marker-wrap",
    html: `<div class="br-findride-ride-marker"><span></span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const escapeHtml = (str) =>
  String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
};

export default function FindRideMap({ source, destination, results = [], onMapLocationSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ start: null, end: null });
  const rideMarkersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const connectorLayerRef = useRef(null);
  const [activePin, setActivePin] = useState("source");
  const activePinRef = useRef("source");
  const [routeInfo, setRouteInfo] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: false,
      keyboard: true,
    });
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    map.on("click", async (event) => {
      const { lat, lng } = event.latlng;
      setReverseLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await response.json();
        const name = (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`).slice(0, 150);
        onMapLocationSelect(activePinRef.current, { name, lat, lng });
      } catch {
        onMapLocationSelect(activePinRef.current, {
          name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        });
      } finally {
        setReverseLoading(false);
      }
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapLocationSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarker = (key, location) => {
      if (!location?.lat || !location?.lng) {
        markersRef.current[key]?.remove();
        markersRef.current[key] = null;
        return;
      }
      const latLng = [Number(location.lat), Number(location.lng)];
      if (!markersRef.current[key]) {
        markersRef.current[key] = L.marker(latLng, {
          icon: pinIcon(key === "start" ? "start" : "end"),
          keyboard: false,
        }).addTo(map);
      } else {
        markersRef.current[key].setLatLng(latLng);
      }
    };

    updateMarker("start", source);
    updateMarker("end", destination);

    const points = [source, destination].filter((p) => p?.lat && p?.lng);
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
    } else if (points.length === 2) {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [Number(p.lat), Number(p.lng)])),
        { padding: [55, 55], maxZoom: 13, duration: 0.9 }
      );
    }
  }, [source, destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    const typed = [
      ["start", source],
      ["end", destination],
    ];

    const resolveTypedPlace = async () => {
      for (const [key, location] of typed) {
        if (cancelled || !location?.name || (location.lat && location.lng) || location.name.trim().length < 3) continue;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.name)}&format=json&limit=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await response.json();
          const match = data?.[0];
          if (!match || cancelled) continue;
          const latLng = [Number(match.lat), Number(match.lon)];
          if (!markersRef.current[key]) {
            markersRef.current[key] = L.marker(latLng, {
              icon: pinIcon(key === "start" ? "start" : "end"),
              keyboard: false,
            }).addTo(map);
          } else {
            markersRef.current[key].setLatLng(latLng);
          }
          map.flyTo(latLng, Math.max(map.getZoom(), 11), { duration: 0.7 });
        } catch {
          // Keep the form usable if geocoding is unavailable.
        }
      }
    };

    const timer = setTimeout(resolveTypedPlace, 550);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [source?.name, destination?.name]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !source?.lat || !source?.lng || !destination?.lat || !destination?.lng) {
      setRouteInfo(null);
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (connectorLayerRef.current) {
        connectorLayerRef.current.remove();
        connectorLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const drawRoute = async () => {
      connectorLayerRef.current?.remove();
      connectorLayerRef.current = null;
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Route unavailable");
        const data = await response.json();
        const route = data.routes?.[0];
        if (!route || cancelled) return;

        setRouteInfo({ duration: route.duration, distance: route.distance });
        routeLayerRef.current?.remove();

        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: {
            color: "#2563eb",
            weight: 5,
            opacity: 0.88,
            lineCap: "round",
            lineJoin: "round",
          },
        }).addTo(map);

        connectorLayerRef.current?.remove();
        connectorLayerRef.current = L.polyline(
          [
            [Number(destination.lat), Number(destination.lng)],
            [Number(source.lat), Number(source.lng)],
          ],
          {
            color: "#2563eb",
            weight: 3,
            opacity: 0.95,
            dashArray: "4 9",
            lineCap: "round",
          }
        ).addTo(map);
      } catch {
        if (!cancelled) setRouteInfo(null);
      }
    };

    drawRoute();
    return () => { cancelled = true; };
  }, [source, destination]);

  const nearby = useMemo(() => results.slice(0, 6), [results]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    rideMarkersRef.current.forEach((marker) => marker.remove());
    rideMarkersRef.current = [];

    results.forEach((ride) => {
      const lat = Number(ride.sourceLatitude);
      const lng = Number(ride.sourceLongitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], { icon: rideIcon(), keyboard: false })
        .addTo(map)
        .bindPopup(
          `<div class="br-findride-ride-popup">` +
            `<strong>${escapeHtml(ride.rider?.firstName || "Rider")}</strong>` +
            `<span>${escapeHtml(ride.sourceName || "")} → ${escapeHtml(ride.destinationName || "")}</span>` +
            `<small>${ride.availableSeats ?? "?"} seat(s) available</small>` +
          `</div>`
        );
      rideMarkersRef.current.push(marker);
    });

    return () => {
      rideMarkersRef.current.forEach((marker) => marker.remove());
      rideMarkersRef.current = [];
    };
  }, [results]);

  const choosePin = (pin) => {
    activePinRef.current = pin;
    setActivePin(pin);
  };

  return (
    <div className="br-findride-map-card">
      <div className="br-findride-map-head">
        <div>
          <div className="br-findride-eyebrow">HOME / PICKUP MAP</div>
          <h3>Find nearby rides</h3>
          <p>Pick a place on the map or choose a suggestion.</p>
        </div>
        <div className="br-findride-live-pill"><i /> {nearby.length} nearby</div>
      </div>

      <div className="br-findride-map-toolbar">
        <button className={activePin === "source" ? "active" : ""} onClick={() => choosePin("source")} type="button">
          <span className="mini-dot start" /> Set pickup
        </button>
        <button className={activePin === "destination" ? "active" : ""} onClick={() => choosePin("destination")} type="button">
          <span className="mini-dot end" /> Set destination
        </button>
      </div>

      <div className="br-findride-map-wrap">
        <div ref={containerRef} className="br-findride-map" />
        <div className="br-findride-map-overlay" />

        <div className="br-findride-map-status">
          <span className="status-dot" />
          {reverseLoading ? "Finding this place…" : `Tap map to set ${activePin === "source" ? "pickup" : "destination"}`}
        </div>

        <div className="br-findride-floating-rides">
          {(nearby).map((ride, index) => (
            <div className="br-car-pill" key={ride.id || index} style={{ "--delay": `${index * 1.2}s` }}>
              <span className="car-dot">●</span>
              {ride.rider?.firstName || "Rider"}
              <b>{ride.availableSeats ?? index + 1} seats</b>
            </div>
          ))}
        </div>

        {routeInfo && (
          <div className="br-findride-route-summary">
            <span>{formatDistance(routeInfo.distance)}</span>
            <strong>{fmtDuration(routeInfo.duration)}</strong>
            <small>estimated driving time</small>
          </div>
        )}
      </div>

      <div className="br-findride-map-stats">
        <div><span>⌁</span><strong>{nearby.length}</strong><small>rides nearby</small></div>
        <div><span>◷</span><strong>{routeInfo ? fmtDuration(routeInfo.duration) : "—"}</strong><small>travel time</small></div>
        <div><span>↗</span><strong>{routeInfo ? formatDistance(routeInfo.distance) : "—"}</strong><small>route distance</small></div>
      </div>
    </div>
  );
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}