import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, Button, Tag, Space } from "antd";
import { ClockCircleOutlined, EnvironmentOutlined, ThunderboltFilled } from "@ant-design/icons";
import { connectSocket, getSocket } from "../../services/socket.js";
import { rideService } from "../../services/rideService.js";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function markerIcon(type) {
  const config = {
    start: { color: "#2563eb", symbol: "S" },
    end: { color: "#7c3aed", symbol: "E" },
    rider: { color: "#16a34a", symbol: "➤" },
    passenger: { color: "#f59e0b", symbol: "•" },
  }[type];

  return L.divIcon({
    className: "br-live-marker-wrapper",
    html: `<div class="br-live-marker br-live-marker-${type}" style="--marker:${config.color}"><span>${config.symbol}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function RecenterOnMove({ position }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.9,
    });
  }, [position, map]);
  return null;
}

function FitRoute({ source, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!source || !destination) return;
    const bounds = L.latLngBounds([
      [source.latitude, source.longitude],
      [destination.latitude, destination.longitude],
    ]);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14, animate: true, duration: 0.8 });
  }, [source, destination, map]);
  return null;
}

export default function LiveTrackingMap({ ride, isOwner, compact = false }) {
  const [livePositions, setLivePositions] = useState({});
  const [myPosition, setMyPosition] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);

  const destination = { latitude: Number(ride.destinationLatitude), longitude: Number(ride.destinationLongitude) };
  const source = { latitude: Number(ride.sourceLatitude), longitude: Number(ride.sourceLongitude) };

  useEffect(() => {
    let mounted = true;
    rideService.getLiveLocation(ride.id).then((data) => {
      if (!mounted) return;
      setLivePositions(data.locations || {});
      setMyPosition(data.myLocation || null);
    }).catch(() => mounted && setUnauthorized(true));

    const socket = connectSocket();
    socket.emit("ride:join", ride.id, (res) => {
      if (!mounted) return;
      if (res?.success) {
        setLivePositions(res.allLocations || {});
        setMyPosition(res.lastKnownLocation || null);
      }
      setConnected(Boolean(res?.success));
      if (res && !res.success) setUnauthorized(true);
    });

    const onBroadcast = (position) => {
      setLivePositions((prev) => ({ ...prev, [position.userId]: position }));
    };
    socket.on("location:broadcast", onBroadcast);

    return () => {
      mounted = false;
      socket.off("location:broadcast", onBroadcast);
      socket.emit("ride:leave");
    };
  }, [ride.id]);

  useEffect(() => () => stopSharing(), []);

  function startSharing() {
    if (!navigator.geolocation) return;
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastEmitRef.current < 3000) return;
        lastEmitRef.current = now;
        const point = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          headingDeg: pos.coords.heading ?? null,
          speedKph: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
        };
        setMyPosition({ ...point, updatedAt: new Date().toISOString() });
        getSocket().emit("location:update", point);
      },
      () => setSharing(false),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  function stopSharing() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setSharing(false);
  }

  const riderPosition = Object.values(livePositions).find((p) => p.userType === "rider") || (isOwner ? myPosition : null);
  const passengerPositions = Object.values(livePositions).filter((p) => p.userType === "passenger");

  const totalKm = useMemo(
    () => haversineKm(source.latitude, source.longitude, destination.latitude, destination.longitude),
    [source.latitude, source.longitude, destination.latitude, destination.longitude]
  );

  const remainingKm = useMemo(() => {
    if (!riderPosition) return null;
    return haversineKm(Number(riderPosition.latitude), Number(riderPosition.longitude), destination.latitude, destination.longitude);
  }, [riderPosition, destination.latitude, destination.longitude]);

  const progressPct = useMemo(() => {
    if (remainingKm == null || !totalKm) return 0;
    const covered = totalKm - remainingKm;
    return Math.min(100, Math.max(0, Math.round((covered / totalKm) * 100)));
  }, [remainingKm, totalKm]);

  const speed = Number(riderPosition?.speedKph);
  const etaMinutes = remainingKm != null ? Math.round((remainingKm / (speed > 5 ? speed : 30)) * 60) : null;
  const center = riderPosition ? [Number(riderPosition.latitude), Number(riderPosition.longitude)] : [source.latitude, source.longitude];

  if (unauthorized) {
    return <Card className={compact ? "live-tracking-card compact-live-card" : "live-tracking-card"} size="small">Live tracking is only visible to the rider and confirmed passengers on this ride.</Card>;
  }

  return (
    <Card
      className={compact ? "live-tracking-card compact-live-card" : "live-tracking-card"}
      size="small"
      title={compact ? null : <Space><EnvironmentOutlined style={{ color: "#2563eb" }} />Live tracking {connected ? <Tag color="green">Connected</Tag> : <Tag>Connecting…</Tag>}</Space>}
      extra={!compact && (
        sharing ? <Button danger size="small" onClick={stopSharing}>Stop sharing</Button> :
        <Button type="primary" size="small" onClick={startSharing}>Share my location</Button>
      )}
    >
      <div className="live-map-frame">
        <MapContainer
          center={center}
          zoom={13}
          className="live-map"
          scrollWheelZoom
          zoomAnimation
          fadeAnimation
          markerZoomAnimation
          wheelPxPerZoomLevel={100}
          zoomSnap={0.5}
          zoomDelta={0.5}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitRoute source={source} destination={destination} />
          {riderPosition && <RecenterOnMove position={riderPosition} />}
          <Marker position={[source.latitude, source.longitude]} icon={markerIcon("start")} />
          <Marker position={[destination.latitude, destination.longitude]} icon={markerIcon("end")} />
          {riderPosition && (
            <>
              <Marker position={[Number(riderPosition.latitude), Number(riderPosition.longitude)]} icon={markerIcon("rider")} />
              <Polyline
                positions={[[Number(riderPosition.latitude), Number(riderPosition.longitude)], [destination.latitude, destination.longitude]]}
                pathOptions={{ color: "#2DD4BF", weight: 5, opacity: 0.85, dashArray: "8 10", lineCap: "round" }}
              />
            </>
          )}
          {passengerPositions.map((passenger) => (
            <Marker key={passenger.userId} position={[Number(passenger.latitude), Number(passenger.longitude)]} icon={markerIcon("passenger")} />
          ))}
        </MapContainer>

        <div className="live-map-overlay">
          <div><span><EnvironmentOutlined /> Remaining</span><strong>{remainingKm != null ? `${remainingKm.toFixed(1)} km` : "Updating"}</strong></div>
          <div><span><ThunderboltFilled /> Speed</span><strong>{speed > 0 ? `${Math.round(speed)} km/h` : "—"}</strong></div>
          <div><span><ClockCircleOutlined /> ETA</span><strong>{etaMinutes != null ? `${etaMinutes} min` : "—"}</strong></div>
        </div>
      </div>

      <div className="live-progress">
        <div className="live-progress-track">
          <div className="live-progress-fill" style={{ width: `${progressPct}%` }} />
          <div className="live-progress-rider" style={{ left: `${progressPct}%` }}>
            <span className="live-progress-rider-dot" />
          </div>
        </div>
        <div className="live-progress-labels">
          <span><i className="live-progress-dot start" /> Start</span>
          <span className="live-progress-pct">{riderPosition ? `${progressPct}% of the way there` : "Not started yet"}</span>
          <span>End <i className="live-progress-dot end" /></span>
        </div>
      </div>

      {!compact && (
        <div className="live-map-footer">
          {riderPosition ? `Rider is ${remainingKm?.toFixed(1) ?? "—"} km from destination.` : "Waiting for the rider to start sharing their location…"}
        </div>
      )}

      <style>{`
        .live-tracking-card{margin-top:16px!important;border-radius:20px!important;border:1px solid rgba(255,255,255,.09)!important;overflow:hidden;background:rgba(255,255,255,.045)!important;backdrop-filter:blur(22px);box-shadow:0 25px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05)}
        .live-tracking-card .ant-card-body{padding:12px!important}.live-tracking-card .ant-card-head{border-bottom:1px solid rgba(255,255,255,.08)!important;color:#F1F5F9}.live-tracking-card .ant-card-head-title{color:#F1F5F9}.live-map-frame{height:320px;border-radius:14px;overflow:hidden;position:relative}.live-map{height:100%;width:100%;background:#05070d}.live-map .leaflet-control-zoom{border:0!important;box-shadow:0 6px 18px rgba(0,0,0,.4)!important}.live-map .leaflet-control-zoom a{border:0!important;color:#E2E8F0!important;background:rgba(255,255,255,.08)!important}.live-map .leaflet-control-attribution{font-size:8px;background:rgba(5,7,13,.6)!important;color:#94a3b8!important;backdrop-filter:blur(6px)}
        .br-live-marker-wrapper{background:transparent!important;border:0!important}.br-live-marker{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(15,18,32,.85);border:2px solid rgba(255,255,255,.15);box-shadow:0 8px 20px rgba(0,0,0,.5);position:relative}.br-live-marker:before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--marker);opacity:.22}.br-live-marker span{position:relative;z-index:1;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--marker);color:white;font-size:10px;font-weight:850;box-shadow:0 3px 8px rgba(0,0,0,.4)}.br-live-marker-rider span{font-size:12px}.br-live-marker-rider:after{content:"";position:absolute;inset:-5px;border:1px solid var(--marker);border-radius:50%;opacity:.35;animation:brRadar 1.8s infinite}@keyframes brRadar{0%{transform:scale(.85);opacity:.6}100%{transform:scale(1.35);opacity:0}}
        .live-map-overlay{position:absolute;z-index:500;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.live-map-overlay>div{padding:8px 9px;border-radius:10px;background:rgba(15,18,32,.85);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(10px);box-shadow:0 5px 16px rgba(0,0,0,.4)}.live-map-overlay span{display:flex;align-items:center;gap:4px;color:#94a3b8;font-size:8px;font-weight:700}.live-map-overlay strong{display:block;color:#F1F5F9;font-size:11px;margin-top:2px}.live-map-footer{padding:9px 2px 0;color:#94a3b8;font-size:12px}.compact-live-card{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important}.compact-live-card .ant-card-body{padding:0!important}.compact-live-card .live-map-frame{height:220px!important}
        .live-progress{padding:14px 4px 2px}.live-progress-track{position:relative;height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:visible}.live-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#2DD4BF,#8B5CF6);box-shadow:0 0 12px rgba(45,212,191,.5);transition:width .6s ease}.live-progress-rider{position:absolute;top:50%;transform:translate(-50%,-50%);transition:left .6s ease}.live-progress-rider-dot{display:block;width:14px;height:14px;border-radius:50%;background:#2DD4BF;border:3px solid #05070d;box-shadow:0 0 0 3px rgba(45,212,191,.3),0 3px 10px rgba(0,0,0,.5)}.live-progress-labels{display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:11px;font-weight:700;color:#94a3b8}.live-progress-labels span{display:flex;align-items:center;gap:5px}.live-progress-pct{color:#F1F5F9;font-weight:800}.live-progress-dot{width:7px;height:7px;border-radius:50%;display:inline-block}.live-progress-dot.start{background:#60a5fa}.live-progress-dot.end{background:#a78bfa}
        @media(max-width:520px){.live-map-frame{height:290px}.compact-live-card .live-map-frame{height:205px!important}.live-map-overlay{left:7px;right:7px;bottom:7px;gap:5px}.live-map-overlay>div{padding:7px}.live-map-overlay span{font-size:7px}.live-map-overlay strong{font-size:10px}.live-progress-labels{font-size:10px}}
      `}</style>
    </Card>
  );
}