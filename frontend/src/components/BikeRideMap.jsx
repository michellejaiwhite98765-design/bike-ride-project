import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MADURAI = [78.1198, 9.9252];
const COIMBATORE = [76.9558, 11.0168];

function createPin(className) {
  const el = document.createElement("div");
  el.className = `br-mapbox-pin ${className}`;
  return el;
}

export default function BikeRideMap({ onViewAll }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const [error, setError] = useState("");
  const [liveLocation, setLiveLocation] = useState(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    if (!token) {
      setError("Mapbox token is missing");
      return undefined;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [77.65, 10.45],
      zoom: 7.6,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: true,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", async () => {
      // Very light blue wash keeps Mapbox's real geographic data aligned
      // with the BikeRide visual system.
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${MADURAI[0]},${MADURAI[1]};${COIMBATORE[0]},${COIMBATORE[1]}?alternatives=false&geometries=geojson&overview=full&access_token=${token}`
        );

        if (!response.ok) throw new Error("Directions request failed");

        const data = await response.json();
        const geometry = data.routes?.[0]?.geometry;

        if (geometry) {
          map.addSource("bikeride-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry,
            },
          });

          map.addLayer({
            id: "bikeride-route-casing",
            type: "line",
            source: "bikeride-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-width": 9,
              "line-opacity": 0.92,
            },
          });

          map.addLayer({
            id: "bikeride-route",
            type: "line",
            source: "bikeride-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#2563eb",
              "line-width": 5,
              "line-opacity": 0.98,
            },
          });
        }
      } catch (routeError) {
        console.warn("BikeRide route preview:", routeError);
      }

      new mapboxgl.Marker({ element: createPin("is-start"), anchor: "bottom" })
        .setLngLat(MADURAI)
        .addTo(map);

      new mapboxgl.Marker({ element: createPin("is-end"), anchor: "bottom" })
        .setLngLat(COIMBATORE)
        .addTo(map);

      map.fitBounds(
        new mapboxgl.LngLatBounds(MADURAI, COIMBATORE),
        { padding: 55, duration: 900, maxZoom: 8.6 }
      );

      // Browser location is optional. If permission is granted, the user's
      // current position is shown as a small live blue dot.
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          ({ coords }) => {
            const position = [coords.longitude, coords.latitude];
            setLiveLocation(position);

            if (!userMarkerRef.current) {
              const el = document.createElement("div");
              el.className = "br-mapbox-user-dot";
              userMarkerRef.current = new mapboxgl.Marker({
                element: el,
                anchor: "center",
              })
                .setLngLat(position)
                .addTo(map);
            } else {
              userMarkerRef.current.setLngLat(position);
            }
          },
          () => {
            // Location permission is optional; keep the map usable.
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="br-mapbox-wrap">
      <div ref={containerRef} className="br-mapbox" />

      <div className="br-mapbox-tint" aria-hidden="true" />

      <div className="br-mapbox-live-badge">
        <span />
        {liveLocation ? "Live location" : "Live map"}
      </div>

      <div className="br-mapbox-route-card">
        <div className="br-avatar">AK</div>
        <div>
          <strong>Madurai → Coimbatore</strong>
          <span>₹350 · 2 seats left</span>
        </div>
      </div>

      {error && (
        <div className="br-mapbox-error">
          {error}. Add <code>VITE_MAPBOX_TOKEN</code> to your frontend <code>.env</code>.
        </div>
      )}

      <button
        type="button"
        className="br-mapbox-view-all"
        onClick={onViewAll}
      >
        View all rides <span>→</span>
      </button>
    </div>
  );
}
