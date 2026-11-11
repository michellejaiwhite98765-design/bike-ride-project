import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, Button, Tag, Space, notification } from "antd";
import { AimOutlined, ArrowLeftOutlined, ArrowUpOutlined, ClockCircleOutlined, EnvironmentOutlined, FlagFilled, RollbackOutlined, SyncOutlined, ThunderboltFilled, UserOutlined } from "@ant-design/icons";
import { formatDistance, metersBetween, useNextTurn } from "./turnByTurn.js";
import { connectSocket, getSocket } from "../../services/socket.js";
import { rideService } from "../../services/rideService.js";
import { COLOR_TILE_URL, COLOR_TILE_ATTRIBUTION, DARK_TILE_FILTER } from "../../constants/mapTiles.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import { DriverReviewsSheet, ratingLabel, useUserRating } from "./DriverReviews.jsx";
import { bikeIcon, startIcon, endIcon, passengerIcon, pickupPinIcon } from "./mapIcons.js";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Real driving route (OSRM) from the ride's start to its end, as [lat, lng] points.
async function getRoute(source, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load route");
  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];
  return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}

// Splits the route at the point closest to the bike: what's behind it and what's ahead.
function splitRoute(points, position) {
  if (!points.length) return { traveled: [], ahead: [] };
  if (!position) return { traveled: [], ahead: points };
  const lat = Number(position.latitude);
  const lng = Number(position.longitude);
  let nearest = 0;
  let best = Infinity;
  points.forEach(([pLat, pLng], index) => {
    const d = (pLat - lat) ** 2 + (pLng - lng) ** 2;
    if (d < best) {
      best = d;
      nearest = index;
    }
  });
  return { traveled: points.slice(0, nearest + 1), ahead: points.slice(nearest) };
}

function RecenterOnMove({ position, follow = true }) {
  const map = useMap();
  useEffect(() => {
    if (!position || !follow) return;
    map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.9,
    });
  }, [position, follow, map]);
  return null;
}

// Full-screen view: open zoomed in on the bike, stop following once the user
// drags the map, and hand the map out so "recenter" can jump back.
function FullscreenFocus({ position, mapRef, onDrag }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    map.on("dragstart", onDrag);
    // The overlay mounts at full size; make Leaflet re-measure it.
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      clearTimeout(t);
      map.off("dragstart", onDrag);
    };
  }, [map, mapRef, onDrag]);
  useEffect(() => {
    if (position) map.setView([Number(position.latitude), Number(position.longitude)], 15, { animate: false });
    // Only on open; RecenterOnMove follows the bike after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    // Bottom padding keeps the markers clear of the stats strip over the map.
    map.fitBounds(bounds, { paddingTopLeft: [40, 60], paddingBottomRight: [40, 100], maxZoom: 14, animate: true, duration: 0.8 });
  }, [source, destination, map]);
  return null;
}

const TURN_ROTATION = { straight: 0, "slight-right": 45, right: 90, "sharp-right": 135, "slight-left": -45, left: -90, "sharp-left": -135 };

function TurnIcon({ direction }) {
  if (direction === "arrive") return <FlagFilled />;
  if (direction === "roundabout") return <SyncOutlined />;
  if (direction === "uturn") return <RollbackOutlined />;
  return <ArrowUpOutlined style={{ transform: `rotate(${TURN_ROTATION[direction] ?? 0}deg)` }} />;
}

const LIVE_PROGRESS_CSS = `.live-progress{padding:14px 4px 2px}.live-progress-track{position:relative;height:6px;border-radius:999px;background:var(--chrome-tint-strong);overflow:visible}.live-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#2DD4BF,#8B5CF6);box-shadow:0 0 12px rgba(45,212,191,.5);transition:width .6s ease}.live-progress-rider{position:absolute;top:50%;transform:translate(-50%,-50%);transition:left .6s ease}.live-progress-rider-dot{display:block;width:14px;height:14px;border-radius:50%;background:#2DD4BF;border:3px solid var(--bg-secondary);box-shadow:0 0 0 3px rgba(45,212,191,.3),0 3px 10px rgba(0,0,0,.5)}.live-progress-labels{display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:11px;font-weight:700;color:var(--text-secondary)}.live-progress-labels span{display:flex;align-items:center;gap:5px}.live-progress-pct{color:var(--text-primary);font-weight:800}.live-progress-dot{width:7px;height:7px;border-radius:50%;display:inline-block}.live-progress-dot.start{background:#60a5fa}.live-progress-dot.end{background:#a78bfa}`;

const BASE_CSS = `
        .live-tracking-card{margin-top:16px!important;border-radius:20px!important;border:1px solid var(--chrome-border)!important;overflow:hidden;background:var(--chrome-tint)!important;backdrop-filter:blur(22px);box-shadow:var(--shadow-lg)}
        .live-tracking-card .ant-card-body{padding:12px!important}.live-tracking-card .ant-card-head{border-bottom:1px solid var(--chrome-border)!important;color:var(--text-primary)}.live-tracking-card .ant-card-head-title{color:var(--text-primary)}.live-map-frame{height:320px;border-radius:14px;overflow:hidden;position:relative}.live-map{height:100%;width:100%;background:var(--map-fallback-bg)}.live-map .leaflet-control-zoom{border:0!important;box-shadow:var(--shadow-md)!important}.live-map .leaflet-control-zoom a{border:0!important;color:var(--text-primary)!important;background:var(--chrome-tint-strong)!important}.live-map .leaflet-control-attribution{font-size:8px;background:var(--surface-glass)!important;color:var(--text-secondary)!important;backdrop-filter:blur(6px)}.ltm-dark-tiles .leaflet-tile-pane{filter:${DARK_TILE_FILTER}}
        .br-live-marker-wrapper{background:transparent!important;border:0!important}.br-live-marker{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--surface-glass);border:2px solid var(--chrome-border);box-shadow:0 8px 20px rgba(0,0,0,.5);position:relative}.br-live-marker:before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--marker);opacity:.22}.br-live-marker span{position:relative;z-index:1;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--marker);color:white;font-size:10px;font-weight:850;box-shadow:0 3px 8px rgba(0,0,0,.4)}.br-live-marker-rider span{font-size:12px}.br-live-marker-rider:after{content:"";position:absolute;inset:-5px;border:1px solid var(--marker);border-radius:50%;opacity:.35;animation:brRadar 1.8s infinite}@keyframes brRadar{0%{transform:scale(.85);opacity:.6}100%{transform:scale(1.35);opacity:0}}
        .live-map-overlay{position:absolute;z-index:500;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.live-map-overlay>div{padding:8px 9px;border-radius:10px;background:var(--surface-glass);border:1px solid var(--chrome-border);backdrop-filter:blur(10px);box-shadow:0 5px 16px rgba(0,0,0,.4)}.live-map-overlay span{display:flex;align-items:center;gap:4px;color:var(--text-secondary);font-size:8px;font-weight:700}.live-map-overlay strong{display:block;color:var(--text-primary);font-size:11px;margin-top:2px}.live-map-footer{padding:9px 2px 0;color:var(--text-secondary);font-size:12px}.compact-live-card{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important}.compact-live-card .ant-card-body{padding:0!important}.compact-live-card .live-map-frame{height:220px!important}
        ${LIVE_PROGRESS_CSS}
        @media(max-width:520px){.live-map-frame{height:290px}.compact-live-card .live-map-frame{height:205px!important}.live-map-overlay{left:7px;right:7px;bottom:7px;gap:5px}.live-map-overlay>div{padding:7px}.live-map-overlay span{font-size:7px}.live-map-overlay strong{font-size:10px}.live-progress-labels{font-size:10px}}
`;

const FULLSCREEN_CSS = `
  .ltm-full{position:fixed;inset:0;z-index:1500;background:var(--bg-primary)}
  .ltm-full-map,.ltm-full-map .live-map{position:absolute;inset:0;height:100%;width:100%}
  .ltm-full-map .ltm-dark-tiles .leaflet-tile-pane{filter:${DARK_TILE_FILTER}}
  .ltm-full .leaflet-control-attribution{font-size:8px}
  .ltm-full-top{position:absolute;z-index:600;top:max(12px,env(safe-area-inset-top));left:12px;right:12px;display:flex;gap:10px;align-items:stretch}
  .ltm-full-icon-btn{width:46px;height:46px;flex:0 0 46px;border-radius:14px;border:1px solid var(--chrome-border);background:var(--chrome-tint-strong);backdrop-filter:blur(14px);color:var(--text-primary);font-size:18px;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}
  .ltm-full-dest{flex:1;min-width:0;display:flex;gap:10px;align-items:center;padding:8px 14px;border-radius:14px;background:#0f766e;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.35)}
  .ltm-full-dest>.anticon{font-size:18px}
  .ltm-full-dest div{min-width:0}
  .ltm-full-dest small{display:block;font-size:10px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  .ltm-full-dest strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ltm-full-dest span{display:block;font-size:11px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ltm-full-recenter{position:absolute;z-index:600;right:12px;bottom:calc(205px + env(safe-area-inset-bottom))}
  .ltm-full-recenter.is-on{color:#2DD4BF}
  .ltm-full-sheet{position:absolute;z-index:600;left:0;right:0;bottom:0;padding:16px 18px calc(16px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:var(--bg-secondary);border-top:1px solid var(--chrome-border);box-shadow:0 -10px 30px rgba(0,0,0,.4)}
  .ltm-full-eta{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}
  .ltm-full-eta strong{flex:0 0 auto;font-size:28px;font-weight:850;color:#2DD4BF;line-height:1}
  .ltm-full-eta span{color:var(--text-secondary);font-size:14px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ltm-full-status{margin:0!important;align-self:center;flex:0 0 auto}
  .ltm-full-hint{display:flex;align-items:center;gap:8px;margin:10px 0 12px;color:var(--text-secondary);font-size:12px;font-weight:600}
  .ltm-full .ltm-full-recenter{position:absolute;right:12px;top:-60px;bottom:auto}
  .ltm-full-turn{flex:1;min-width:0;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.35)}
  .ltm-full-turn-main{display:flex;gap:12px;align-items:center;padding:10px 14px;background:#0f766e;color:#fff}
  .ltm-full-turn-icon{font-size:30px;line-height:1;display:grid;place-items:center;width:38px}
  .ltm-full-turn-icon .anticon{font-size:32px}
  .ltm-full-turn-main div{min-width:0}
  .ltm-full-turn-main strong{display:block;font-size:22px;font-weight:850;line-height:1.1}
  .ltm-full-turn-main span{display:block;font-size:13px;font-weight:600;opacity:.95;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .ltm-full-turn-then{padding:6px 14px;background:#115e59;color:#ccfbf1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ltm-full-recenter-pill{position:absolute;z-index:600;left:50%;transform:translateX(-50%);top:-58px;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:0;background:var(--bg-secondary);color:#2DD4BF;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.45)}
  .ltm-full-people{display:flex;gap:8px;overflow-x:auto;margin:0 -2px 4px;padding:2px 2px 6px}
  .ltm-full-person{flex:0 0 auto;max-width:240px;display:flex;align-items:center;gap:9px;padding:8px 12px 8px 8px;border-radius:14px;border:1px solid var(--chrome-border);background:var(--chrome-tint);color:var(--text-primary);cursor:pointer;text-align:left}
  .ltm-full-person.is-focused{border-color:#2DD4BF}
  .ltm-full-person-dot{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:var(--chrome-tint-strong);color:var(--text-secondary)}
  .ltm-full-person-dot.is-live{background:#f59e0b;color:#fff;box-shadow:0 0 0 3px rgba(245,158,11,.25)}
  .ltm-full-person-dot.is-driver{background:#2DD4BF;color:#fff}
  .ltm-full-driver small{color:#eab308!important;font-weight:700}
  .ltm-full-person-text{min-width:0}
  .ltm-full-person-text strong{display:block;font-size:13px}
  .ltm-full-person-text small{display:block;font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  @media(min-width:769px){.ltm-full-sheet{left:50%;right:auto;width:440px;bottom:16px;border-radius:22px;transform:translateX(-50%);border:1px solid var(--chrome-border)}}
`;

const LOCATION_ERRORS = {
  1: "Location access is blocked. Allow location for this site in your browser settings, then tap Share my location again.",
  2: "Your location couldn't be found. Check that GPS / location services are turned on.",
  3: "Getting your location took too long. Move to an open area and try again.",
  default: "Something went wrong while reading your location. Please try again.",
};

// `autoShare` starts sharing this device's location as soon as the map opens
// (used once a join request is accepted, so rider and passenger can find each
// other). The rider sees every accepted passenger's live position and pickup
// point; a passenger sees the rider live, and themselves.
// `fullscreen` renders a navigation-style full-screen view (map edge to edge,
// destination bar on top, ETA sheet below); `onClose` closes it.
export default function LiveTrackingMap({ ride, isOwner, compact = false, autoShare = false, fullscreen = false, onClose }) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [livePositions, setLivePositions] = useState({});
  const [myPosition, setMyPosition] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const watchIdRef = useRef(null);
  // Full-screen view follows the bike until the user drags the map.
  const [following, setFollowing] = useState(true);
  const mapRef = useRef(null);
  const stopFollowing = useCallback(() => setFollowing(false), []);
  const [focusedPassenger, setFocusedPassenger] = useState(null);
  const lastEmitRef = useRef(0);
  // Accepted passengers (rider's view) / the viewer's own request (passenger's view):
  // who they are and where they are to be picked up.
  const [participants, setParticipants] = useState([]);
  // Passenger's view: the driver in the People strip, with their rating and reviews.
  const driver = ride.rider ? { ...ride.rider, id: ride.rider.id || ride.riderId } : ride.riderId ? { id: ride.riderId } : null;
  const driverRating = useUserRating(!isOwner && fullscreen ? driver?.id : null);
  const [driverSheetOpen, setDriverSheetOpen] = useState(false);

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

  // Start sharing automatically when asked to (and only once per mount).
  useEffect(() => {
    if (!autoShare || !["PUBLISHED", "STARTED"].includes(ride.status)) return undefined;
    if (watchIdRef.current == null) startSharing();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, ride.id, ride.status]);

  // Who to draw: the rider polls the accepted requests; a passenger reads their own.
  useEffect(() => {
    if (!["PUBLISHED", "STARTED"].includes(ride.status)) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        if (isOwner) {
          const requests = await rideService.listRequests(ride.id);
          if (cancelled) return;
          setParticipants(
            requests
              .filter((r) => r.status === "ACCEPTED" && r.booking?.bookingStatus !== "CANCELLED")
              .map((r) => ({
                userId: r.passengerId,
                name: [r.passenger?.firstName, r.passenger?.lastName].filter(Boolean).join(" ") || "Passenger",
                pickup: { latitude: Number(r.pickupLatitude), longitude: Number(r.pickupLongitude), name: r.pickupName },
              }))
          );
        } else {
          const mine = await rideService.getMyRequest(ride.id);
          if (cancelled) return;
          setParticipants(
            mine && mine.status === "ACCEPTED"
              ? [{ userId: "me", name: "You", pickup: { latitude: Number(mine.pickupLatitude), longitude: Number(mine.pickupLongitude), name: mine.pickupName } }]
              : []
          );
        }
      } catch {
        if (!cancelled) setParticipants([]);
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ride.id, ride.status, isOwner]);

  function startSharing() {
    if (!navigator.geolocation) {
      notification.error({ title: "Location unavailable", description: "This device or browser can't share its location." });
      return;
    }
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
      (err) => {
        stopSharing();
        notification.error({ title: "Couldn't share your location", description: LOCATION_ERRORS[err?.code] || LOCATION_ERRORS.default });
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  function stopSharing() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setSharing(false);
  }

  const [routePoints, setRoutePoints] = useState([]);
  useEffect(() => {
    let cancelled = false;
    // The route the rider chose when creating the trip, else the fastest road route.
    (ride?.routePath?.length >= 2 ? Promise.resolve(ride.routePath) : getRoute(source, destination))
      .then((points) => {
        if (!cancelled) setRoutePoints(points);
      })
      .catch(() => {
        // No road route available - the map falls back to a straight dashed line.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.latitude, source.longitude, destination.latitude, destination.longitude]);

  const riderPosition = Object.values(livePositions).find((p) => p.userType === "rider") || (isOwner ? myPosition : null);
  const passengerPositions = Object.values(livePositions).filter((p) => p.userType === "passenger");
  const { traveled, ahead } = useMemo(() => splitRoute(routePoints, riderPosition), [routePoints, riderPosition]);

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

  const mapEl = (
        <MapContainer
          center={center}
          zoom={13}
          className={`live-map${isDark ? " ltm-dark-tiles" : ""}`}
          zoomControl={!fullscreen}
          scrollWheelZoom
          zoomAnimation
          fadeAnimation
          markerZoomAnimation
          wheelPxPerZoomLevel={100}
          zoomSnap={0.5}
          zoomDelta={0.5}
        >
          <TileLayer attribution={COLOR_TILE_ATTRIBUTION} url={COLOR_TILE_URL} />
          {fullscreen ? <FullscreenFocus position={riderPosition} mapRef={mapRef} onDrag={stopFollowing} /> : <FitRoute source={source} destination={destination} />}
          {riderPosition && <RecenterOnMove position={riderPosition} follow={!fullscreen || following} />}
          {routePoints.length > 1 ? (
            <>
              {traveled.length > 1 && (
                <Polyline positions={traveled} pathOptions={{ color: "#94A3B8", weight: 6, opacity: 0.6, lineCap: "round", lineJoin: "round" }} />
              )}
              <Polyline positions={ahead} pathOptions={{ color: "#2DD4BF", weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
            </>
          ) : (
            <Polyline
              positions={[[source.latitude, source.longitude], [destination.latitude, destination.longitude]]}
              pathOptions={{ color: "#2DD4BF", weight: 5, opacity: 0.7, dashArray: "8 10", lineCap: "round" }}
            />
          )}
          <Marker position={[source.latitude, source.longitude]} icon={startIcon()} />
          <Marker position={[destination.latitude, destination.longitude]} icon={endIcon()} />
          {/* The bike always shows: at its latest reported position while the
              ride is under way, otherwise waiting at the start. */}
          {!riderPosition && <Marker position={[source.latitude, source.longitude]} icon={bikeIcon()} zIndexOffset={500} />}
          {riderPosition && (
            <>
              <Marker
                position={[Number(riderPosition.latitude), Number(riderPosition.longitude)]}
                icon={bikeIcon({ live: true })}
                zIndexOffset={1000}
              />
            </>
          )}
          {/* Pickup points of the accepted passengers */}
          {participants
            .filter((p) => Number.isFinite(p.pickup.latitude) && Number.isFinite(p.pickup.longitude))
            .map((p) => (
              <Marker key={`pickup-${p.userId}`} position={[p.pickup.latitude, p.pickup.longitude]} icon={pickupPinIcon()}>
                <Popup>{isOwner ? `${p.name} · ${p.pickup.name || "pickup"}` : p.pickup.name || "Your pickup point"}</Popup>
              </Marker>
            ))}
          {/* Live passengers (rider's view) */}
          {isOwner &&
            passengerPositions.map((passenger) => {
              const person = participants.find((p) => p.userId === passenger.userId);
              return (
                <Marker
                  key={passenger.userId}
                  position={[Number(passenger.latitude), Number(passenger.longitude)]}
                  icon={passengerIcon(person?.name || "Passenger", { showName: true })}
                  zIndexOffset={800}
                >
                  <Popup>{person?.name || "Passenger"}</Popup>
                </Marker>
              );
            })}
          {/* The passenger's own position (passenger's view) */}
          {!isOwner && myPosition && (
            <Marker position={[Number(myPosition.latitude), Number(myPosition.longitude)]} icon={passengerIcon("You", { you: true })} zIndexOffset={800} />
          )}
        </MapContainer>
  );

  // Turn-by-turn from the bike to the destination (full screen only).
  const nextTurn = useNextTurn(fullscreen ? riderPosition : null, destination, fullscreen);

  if (fullscreen) {
    const flyTo = (point, zoom = 16) => {
      if (mapRef.current && point) mapRef.current.flyTo([Number(point.latitude), Number(point.longitude)], zoom, { duration: 0.6 });
    };
    // People on the ride, with where they are now and how far from the bike.
    const people = isOwner
      ? participants.map((p) => {
        const live = passengerPositions.find((pos) => pos.userId === p.userId);
        return { key: p.userId, name: p.name, live, pickup: p.pickup };
      })
      : participants.map((p) => ({ key: "me", name: "You", live: myPosition, pickup: p.pickup }));
    const distanceFromBike = (point) =>
      riderPosition && point && Number.isFinite(Number(point.latitude))
        ? formatDistance(metersBetween(
          { latitude: Number(riderPosition.latitude), longitude: Number(riderPosition.longitude) },
          { latitude: Number(point.latitude), longitude: Number(point.longitude) }
        ))
        : null;
    const showPerson = (person) => {
      setFollowing(false);
      setFocusedPassenger(person.key);
      flyTo(person.live || person.pickup);
    };
    const recenter = () => {
      setFocusedPassenger(null);
      setFollowing(true);
      const target = riderPosition || myPosition;
      if (mapRef.current && target) mapRef.current.flyTo([Number(target.latitude), Number(target.longitude)], 15, { duration: 0.6 });
    };
    const recenterControl = (
        following ? (
          <button type="button" className="ltm-full-icon-btn ltm-full-recenter is-on" onClick={recenter} aria-label="Following the bike">
            <AimOutlined />
          </button>
        ) : (
          <button type="button" className="ltm-full-recenter-pill" onClick={recenter}>
            <AimOutlined /> Re-center
          </button>
        )
    );
    return (
      <div className="ltm-full" role="dialog" aria-label="Live tracking">
        <div className="ltm-full-map">{mapEl}</div>

        <div className="ltm-full-top">
          <button type="button" className="ltm-full-icon-btn" onClick={onClose} aria-label="Close live tracking">
            <ArrowLeftOutlined />
          </button>
          {nextTurn ? (
            <div className="ltm-full-turn" aria-live="polite">
              <div className="ltm-full-turn-main">
                <span className="ltm-full-turn-icon"><TurnIcon direction={nextTurn.direction} /></span>
                <div>
                  <strong>{nextTurn.direction === "arrive" ? formatDistance(nextTurn.distanceM) || "now" : formatDistance(nextTurn.distanceM)}</strong>
                  <span>{nextTurn.text}</span>
                </div>
              </div>
              {nextTurn.thenText && <div className="ltm-full-turn-then">Then: {nextTurn.thenText}</div>}
            </div>
          ) : (
            <div className="ltm-full-dest">
              <FlagFilled />
              <div>
                <small>{isOwner ? "Heading to" : "Riding to"}</small>
                <strong>{ride.destinationName || "Destination"}</strong>
                <span>from {ride.sourceName || "start"}</span>
              </div>
            </div>
          )}
        </div>


        <div className="ltm-full-sheet">
          {recenterControl}
          <div className="ltm-full-eta">
            <strong>{etaMinutes != null ? `${etaMinutes} min` : "—"}</strong>
            <span>
              {remainingKm != null ? `${remainingKm.toFixed(1)} km` : "Waiting for location"}
              {speed > 0 ? ` · ${Math.round(speed)} km/h` : ""}
            </span>
          </div>
          <div className="live-progress-track">
            <div className="live-progress-fill" style={{ width: `${progressPct}%` }} />
            <div className="live-progress-rider" style={{ left: `${progressPct}%` }}><span className="live-progress-rider-dot" /></div>
          </div>
          {(people.length > 0 || (!isOwner && driver)) && (
            <div className="ltm-full-people">
              {!isOwner && driver && (
                <button type="button" className="ltm-full-person ltm-full-driver" onClick={() => setDriverSheetOpen(true)}>
                  <span className="ltm-full-person-dot is-driver"><UserOutlined /></span>
                  <span className="ltm-full-person-text">
                    <strong>{[driver.firstName, driver.lastName].filter(Boolean).join(" ") || "Your driver"}</strong>
                    <small>Driver{driverRating ? ` · ${ratingLabel(driverRating)}` : ""} · Reviews</small>
                  </span>
                </button>
              )}
              {people.map((person) => {
                const away = distanceFromBike(person.live);
                return (
                  <button type="button" key={person.key} className={`ltm-full-person${focusedPassenger === person.key ? " is-focused" : ""}`} onClick={() => showPerson(person)}>
                    <span className={`ltm-full-person-dot${person.live ? " is-live" : ""}`}><UserOutlined /></span>
                    <span className="ltm-full-person-text">
                      <strong>{person.name}</strong>
                      <small>
                        {person.live
                          ? `${isOwner ? "Live" : "Your location"}${away ? ` · ${away} from ${isOwner ? "you" : "rider"}` : ""}`
                          : `Not sharing · pickup ${person.pickup?.name || "point"}`}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="ltm-full-hint">
            <Tag color={connected ? "green" : "default"} className="ltm-full-status">{connected ? "Live" : "Connecting…"}</Tag>
            {riderPosition ? `${progressPct}% of the way there` : isOwner ? "Share your location so passengers can follow you" : "Waiting for the rider to share their location…"}
          </div>
          {sharing ? (
            <Button danger block size="large" onClick={stopSharing}>Stop sharing</Button>
          ) : (
            <Button type="primary" block size="large" onClick={startSharing}>Share my location</Button>
          )}
        </div>
        {!isOwner && driver && <DriverReviewsSheet driver={driver} open={driverSheetOpen} onClose={() => setDriverSheetOpen(false)} />}
        <style>{BASE_CSS + FULLSCREEN_CSS}</style>
      </div>
    );
  }

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
        {mapEl}

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

      <style>{BASE_CSS}</style>
    </Card>
  );
}