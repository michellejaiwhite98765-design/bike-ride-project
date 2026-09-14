import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { ArrowRightOutlined, TeamOutlined } from "@ant-design/icons";
import { COLOR_TILE_URL, COLOR_TILE_ATTRIBUTION } from "../../constants/mapTiles.js";
import { PERSON_ICON_SVG, vehicleIconSvg } from "../../utils/mapIcons.js";
import { fetchNearbyPlaces } from "../../utils/nearbyPlaces.js";

const DEFAULT_CENTER = [9.9252, 78.1198]; // Madurai - same fallback HomePage already uses.
const SOLO_ZOOM = 14;
const PLACE_LINE_COLOR = "#22C55E";

function meIcon() {
  return L.divIcon({
    className: "hlm-me-wrapper",
    html: `<div class="hlm-me"><div class="hlm-me-ring"></div><div class="hlm-me-dot">${PERSON_ICON_SVG}</div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function rideIcon(vehicleType) {
  return L.divIcon({
    className: "hlm-pin-wrapper",
    html: `<div class="hlm-pin">${vehicleIconSvg(vehicleType)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function placeIcon(place) {
  return L.divIcon({
    className: "hlm-pin-wrapper",
    html: `<div class="hlm-place" style="--place-color:${place.color}">${place.icon}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try {
      if (points.length === 1) {
        map.setView(points[0], SOLO_ZOOM);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
      }
    } catch {
      // Map may already be mid-teardown if this card was swapped away fast.
    }
  }, [map, points]);
  return null;
}

// Nearby "busy places" (bus stand / airport / mall) around the visitor's own
// location, each connected back to it with a dashed line and name label -
// same treatment as the Find a Ride page's map, brought to the homepage.
function NearbyPlaces({ userLocation }) {
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    if (!userLocation) {
      setPlaces([]);
      return undefined;
    }
    let cancelled = false;
    fetchNearbyPlaces(userLocation.latitude, userLocation.longitude)
      .then((result) => {
        if (!cancelled) setPlaces(result);
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  if (!userLocation || places.length === 0) return null;

  return (
    <>
      {places.map((place) => (
        <div key={place.id}>
          <Polyline
            positions={[
              [userLocation.latitude, userLocation.longitude],
              [place.lat, place.lng],
            ]}
            pathOptions={{ color: PLACE_LINE_COLOR, weight: 2, opacity: 0.7, dashArray: "3 8" }}
          />
          <Marker position={[place.lat, place.lng]} icon={placeIcon(place)}>
            <Tooltip permanent direction="top" offset={[0, -10]} className="hlm-place-label">
              {place.name} · {place.distanceKm.toFixed(1)} km
            </Tooltip>
          </Marker>
        </div>
      ))}
    </>
  );
}

/**
 * Real, colorful Leaflet map for the homepage hero - shows the visitor's
 * own live location plus every currently-fetched nearby ride as a pin, and
 * nearby busy places (bus stand/mall/airport) with dashed connector lines
 * and distance-labeled names, matching the Find a Ride page's map.
 */
export default function HeroLiveMap({ userLocation, nearbyRides }) {
  const ridePoints = useMemo(
    () =>
      nearbyRides
        .map((ride) => ({
          ride,
          position: [Number(ride.sourceLatitude), Number(ride.sourceLongitude)],
        }))
        .filter((p) => Number.isFinite(p.position[0]) && Number.isFinite(p.position[1])),
    [nearbyRides]
  );

  const center = userLocation ? [userLocation.latitude, userLocation.longitude] : DEFAULT_CENTER;
  const fitPoints = useMemo(() => {
    const points = ridePoints.map((p) => p.position);
    if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);
    return points;
  }, [ridePoints, userLocation]);

  return (
    <div className="hlm-shell">
      <MapContainer
        center={center}
        zoom={SOLO_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer attribution={COLOR_TILE_ATTRIBUTION} url={COLOR_TILE_URL} />
        <FitToMarkers points={fitPoints} />
        <NearbyPlaces userLocation={userLocation} />

        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={meIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {ridePoints.map(({ ride, position }) => {
          const isFree = ride.rideType === "WITHOUT_TIP";
          return (
            <Marker key={ride.id} position={position} icon={rideIcon(ride.vehicle?.vehicleType)}>
              <Popup>
                <div className="hlm-popup">
                  <strong>
                    {ride.sourceName?.split(",")[0]} <ArrowRightOutlined /> {ride.destinationName?.split(",")[0]}
                  </strong>
                  <div className="hlm-popup-meta">
                    <span>{isFree ? "Free" : `₹${ride.tipAmount}`}</span>
                    <span>
                      <TeamOutlined /> {ride.availableSeats} seat{ride.availableSeats === 1 ? "" : "s"} left
                    </span>
                  </div>
                  <Link to={`/rides/${ride.id}`}>View ride</Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style>{`
        .hlm-shell{position:absolute;inset:0;border-radius:18px;overflow:hidden}
        .hlm-shell .leaflet-container{background:#dbe4ec;font-family:inherit}
        .hlm-shell .leaflet-popup-content-wrapper{border-radius:12px}
        .hlm-shell .leaflet-control-attribution{font-size:9px}

        .hlm-me-wrapper,.hlm-pin-wrapper{background:transparent!important;border:0!important}

        .hlm-me{position:relative;width:26px;height:26px;display:grid;place-items:center}
        .hlm-me-dot{position:relative;z-index:1;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff}
        .hlm-me-ring{position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.35);animation:hlmPulse 1.8s infinite}
        @keyframes hlmPulse{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.2);opacity:0}}

        .hlm-pin{width:28px;height:28px;border-radius:50%;background:#0f766e;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff}

        .hlm-place{width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid var(--place-color,#94a3b8);box-shadow:0 2px 6px rgba(0,0,0,.3);display:grid;place-items:center;color:var(--place-color,#94a3b8)}
        .hlm-place svg{display:block}

        .hlm-shell .hlm-place-label{background:rgba(11,15,23,.88);border:0;color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;box-shadow:none}
        .hlm-shell .hlm-place-label::before{display:none}

        .hlm-popup{min-width:160px;display:flex;flex-direction:column;gap:4px}
        .hlm-popup strong{font-size:13px;color:#0f172a}
        .hlm-popup-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#475569}
        .hlm-popup a{font-size:12px;font-weight:700;color:#0f766e;margin-top:2px}
      `}</style>
    </div>
  );
}
