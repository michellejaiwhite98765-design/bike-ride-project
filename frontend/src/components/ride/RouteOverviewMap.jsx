import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Spin, Tag } from "antd";
import { ClockCircleOutlined, EnvironmentOutlined, LoadingOutlined, RiseOutlined } from "@ant-design/icons";
import { DARK_TILE_BASE_URL, DARK_TILE_REFERENCE_URL, DARK_TILE_ATTRIBUTION } from "../../constants/mapTiles.js";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pinIcon(type) {
  const isStart = type === "start";
  return L.divIcon({
    className: "ro-pin-wrapper",
    html: `<div class="ro-pin ${isStart ? "ro-pin-start" : "ro-pin-end"}"><span class="ro-pin-core"></span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 43],
  });
}

function FitRoute({ source, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!source || !destination) return;
    const bounds = L.latLngBounds([
      [source.latitude, source.longitude],
      [destination.latitude, destination.longitude],
    ]);
    map.flyToBounds(bounds, { padding: [46, 46], maxZoom: 14, duration: 0.85 });
  }, [source, destination, map]);
  return null;
}

async function getRoute(source, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
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
 * Static "before the ride starts" (and "after it ends") route preview.
 * Shows start/end markers plus the real road route as a dotted line, with a
 * distance + estimated drive-time chip. This is intentionally always rendered,
 * regardless of ride status, so ride details never show a blank map.
 */
export default function RouteOverviewMap({ ride, compact = false }) {
  const [route, setRoute] = useState({ points: [], distanceKm: null, durationMin: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const source = useMemo(
    () => ({ latitude: Number(ride.sourceLatitude), longitude: Number(ride.sourceLongitude) }),
    [ride.sourceLatitude, ride.sourceLongitude]
  );
  const destination = useMemo(
    () => ({ latitude: Number(ride.destinationLatitude), longitude: Number(ride.destinationLongitude) }),
    [ride.destinationLatitude, ride.destinationLongitude]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    getRoute(source, destination)
      .then((result) => {
        if (cancelled) return;
        setRoute(result);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setRoute({
          points: [[source.latitude, source.longitude], [destination.latitude, destination.longitude]],
          distanceKm: haversineKm(source.latitude, source.longitude, destination.latitude, destination.longitude),
          durationMin: null,
        });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [source, destination]);

  const center = [(source.latitude + destination.latitude) / 2, (source.longitude + destination.longitude) / 2];

  return (
    <div className={`ro-shell ${compact ? "ro-compact" : ""}`}>
      <div className="ro-map">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom
          zoomAnimation
          wheelDebounce={35}
          wheelPxPerZoomLevel={90}
          touchZoom
          zoomSnap={0.5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_BASE_URL} />
          <TileLayer url={DARK_TILE_REFERENCE_URL} />
          <FitRoute source={source} destination={destination} />

          <Marker position={[source.latitude, source.longitude]} icon={pinIcon("start")} />
          <Marker position={[destination.latitude, destination.longitude]} icon={pinIcon("end")} />

          {route.points.length > 1 && (
            <>
              <Polyline
                positions={route.points}
                pathOptions={{ color: "#0b1220", weight: 7, opacity: 0.55, lineCap: "round", lineJoin: "round" }}
              />
              <Polyline
                positions={route.points}
                pathOptions={{
                  color: "#2DD4BF",
                  weight: 4,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: "1 12",
                }}
              />
            </>
          )}
        </MapContainer>

        {loading && (
          <div className="ro-loading">
            <Spin indicator={<LoadingOutlined spin />} size="small" />
            <span>Loading route…</span>
          </div>
        )}

        <div className="ro-legend">
          <span><i className="ro-dot ro-dot-start" /> Start</span>
          <span><i className="ro-dot ro-dot-end" /> End</span>
        </div>

        <div className="ro-chips">
          <Tag className="ro-chip" icon={<RiseOutlined />}>
            {route.distanceKm != null ? `${route.distanceKm.toFixed(1)} km` : "—"}
          </Tag>
          <Tag className="ro-chip" icon={<ClockCircleOutlined />}>
            {route.durationMin != null ? `~${Math.round(route.durationMin)} min drive` : failed ? "Estimate unavailable" : "…"}
          </Tag>
        </div>
      </div>

      <div className="ro-endpoints">
        <div className="ro-endpoint">
          <span className="ro-endpoint-dot ro-dot-start" />
          <div>
            <div className="ro-endpoint-label">Start</div>
            <div className="ro-endpoint-value">{ride.sourceName}</div>
          </div>
        </div>
        <div className="ro-endpoint-divider" />
        <div className="ro-endpoint">
          <span className="ro-endpoint-dot ro-dot-end" />
          <div>
            <div className="ro-endpoint-label">End</div>
            <div className="ro-endpoint-value">{ride.destinationName}</div>
          </div>
        </div>
      </div>

      <style>{`
        .ro-shell{display:flex;flex-direction:column;background:transparent}
        .ro-map{position:relative;height:400px;overflow:hidden}
        .ro-compact .ro-map{height:220px}
        .ro-map .leaflet-container{height:100%;width:100%;background:#05070d;z-index:0}
        .ro-map .leaflet-control-zoom{border:0!important;box-shadow:0 8px 22px rgba(0,0,0,.4)!important;border-radius:10px!important;overflow:hidden}
        .ro-map .leaflet-control-zoom a{width:32px!important;height:32px!important;line-height:32px!important;color:#E2E8F0!important;background:rgba(255,255,255,.08)!important;border:0!important}
        .ro-map .leaflet-control-attribution{font-size:8px;background:rgba(5,7,13,.6)!important;color:#94a3b8!important}
        .ro-map .leaflet-control-attribution a{color:#94a3b8!important}
        .ro-compact .leaflet-control-zoom{display:none!important}

        .ro-pin-wrapper{background:transparent!important;border:0!important}
        .ro-pin{width:36px;height:36px;position:relative;display:grid;place-items:center;border-radius:13px 13px 13px 3px;transform:rotate(-45deg);border:3px solid rgba(5,7,13,.85);box-shadow:0 8px 20px rgba(0,0,0,.55)}
        .ro-pin-start{background:linear-gradient(135deg,#60a5fa,#a78bfa)}
        .ro-pin-end{background:linear-gradient(135deg,#2dd4bf,#14b8a6)}
        .ro-pin-core{width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.2)}

        .ro-loading{position:absolute;left:50%;top:50%;z-index:600;transform:translate(-50%,-50%);display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;background:rgba(15,18,32,.9);border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 26px rgba(0,0,0,.5);color:#E2E8F0;font-size:12px;font-weight:600;pointer-events:none;backdrop-filter:blur(10px)}

        .ro-legend{position:absolute;left:12px;bottom:12px;z-index:500;display:flex;gap:10px;padding:7px 11px;border-radius:10px;background:rgba(15,18,32,.85);border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 20px rgba(0,0,0,.4);font-size:11px;backdrop-filter:blur(10px)}
        .ro-legend span{display:inline-flex;align-items:center;gap:5px;color:#E2E8F0;font-weight:600}
        .ro-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
        .ro-dot-start{background:#60a5fa}
        .ro-dot-end{background:#2dd4bf}

        .ro-chips{position:absolute;right:12px;top:12px;z-index:500;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
        .ro-chip.ant-tag{margin:0;border:1px solid rgba(255,255,255,.1)!important;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:700;color:#F1F5F9!important;background:rgba(15,18,32,.85)!important;box-shadow:0 8px 20px rgba(0,0,0,.4);backdrop-filter:blur(10px)}

        .ro-endpoints{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.08)}
        .ro-endpoint{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
        .ro-endpoint-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .ro-endpoint-label{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748b}
        .ro-endpoint-value{font-size:13px;font-weight:700;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ro-endpoint-divider{width:28px;height:2px;flex-shrink:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.25) 0 5px,transparent 5px 9px);border-radius:2px}

        @media (max-width:600px){
          .ro-map{height:280px}
          .ro-compact .ro-map{height:190px}
          .ro-endpoints{padding:12px 14px;gap:10px}
          .ro-endpoint-value{font-size:12px}
        }
      `}</style>
    </div>
  );
}