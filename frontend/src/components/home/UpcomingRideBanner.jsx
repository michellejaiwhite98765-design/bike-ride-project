import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "antd";
import {
  ArrowRightOutlined,
  CarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltFilled,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { rideService } from "../../services/rideService.js";
import { haversineKm } from "../../utils/geo.js";
import RideMiniMap from "../ride/RideMiniMap.jsx";

const LIVE_POLL_MS = 15000;
// No live route/duration API call here (RideMiniMap already makes one for
// the thumbnail) - a flat average speed gives a good-enough ETA for display.
const ASSUMED_SPEED_KMH = 30;

// "in 45 min" / "in 3h 20m" / "in 2d" - kept dependency-free rather than
// pulling in dayjs's relativeTime plugin for a single label.
function formatCountdown(target) {
  const diffMin = target.diff(dayjs(), "minute");
  if (diffMin <= 0) return "starting soon";
  if (diffMin < 60) return `in ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `in ${hours}h ${diffMin % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

// "Anna Nagar, Madurai, Tamil Nadu, India" -> "Anna Nagar" (headline) /
// "Madurai, Tamil Nadu, India" (subtext) - a stop name plus its fuller
// address underneath, like a boarding-pass style route line.
function splitPlace(name) {
  const [head, ...rest] = (name || "").split(",");
  return { head: head?.trim() || name, rest: rest.join(",").trim() };
}

/**
 * Homepage "next ride" card. Used two ways:
 *  - compact=false (default): the full card - route timeline, mini map,
 *    rider/vehicle details, live distance, and a CTA.
 *  - compact=true: a small "cover" used for the non-focused cards in the
 *    coverflow carousel - just enough to identify the ride, no map (so a
 *    scaled/rotated Leaflet instance is never a concern) - clicking it
 *    calls onActivate to bring it to the front instead of navigating.
 */
export default function UpcomingRideBanner({ ride, compact = false, onActivate }) {
  const navigate = useNavigate();
  const [gapKm, setGapKm] = useState(null);

  useEffect(() => {
    if (compact || ride.status !== "STARTED") {
      setGapKm(null);
      return undefined;
    }

    let cancelled = false;

    function refresh() {
      Promise.all([
        rideService.getLiveLocation(ride.rideId).catch(() => null),
        new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            () => resolve(null),
            { maximumAge: 30000, timeout: 4000 }
          );
        }),
      ]).then(([liveData, myCoords]) => {
        if (cancelled || !liveData) return;
        const positions = Object.values(liveData.locations || {});
        const riderPos = positions.find((p) => p.userType === "rider");
        if (!riderPos) return;

        if (ride.role === "passenger" && myCoords) {
          // The literal "rider to passenger" distance, using the passenger's
          // own live position (already permission-gated at login).
          setGapKm(haversineKm(Number(riderPos.latitude), Number(riderPos.longitude), myCoords.latitude, myCoords.longitude));
        } else {
          // Fallback (rider viewing their own card, or passenger location
          // unavailable): distance from the rider to the destination.
          setGapKm(
            haversineKm(
              Number(riderPos.latitude),
              Number(riderPos.longitude),
              Number(ride.destinationLatitude),
              Number(ride.destinationLongitude)
            )
          );
        }
      });
    }

    refresh();
    const interval = setInterval(refresh, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [compact, ride.rideId, ride.role, ride.status, ride.destinationLatitude, ride.destinationLongitude]);

  const isLive = ride.status === "STARTED";
  const isPassenger = ride.role === "passenger";
  const source = splitPlace(ride.sourceName);
  const destination = splitPlace(ride.destinationName);

  function handleClick() {
    if (compact) {
      onActivate?.();
      return;
    }
    navigate(ride.linkTo);
  }

  if (compact) {
    return (
      <div className="urb-card urb-compact" onClick={handleClick} role="button" tabIndex={0}>
        <span className={`urb-status-pill${isLive ? " is-live" : ""}`}>
          {isLive ? <span className="urb-live-dot" /> : <ClockCircleOutlined />}
          {isLive ? "Live" : formatCountdown(ride.departure)}
        </span>
        <div className="urb-compact-route">
          <strong>{source.head}</strong>
          <ArrowRightOutlined />
          <strong>{destination.head}</strong>
        </div>
        <div className="urb-compact-meta">
          <span>{ride.departure.format("h:mm A")}</span>
          <span className="urb-role-tag">{isPassenger ? "Riding" : "Driving"}</span>
        </div>
        <CardStyles />
      </div>
    );
  }

  const totalKm = haversineKm(
    Number(ride.sourceLatitude),
    Number(ride.sourceLongitude),
    Number(ride.destinationLatitude),
    Number(ride.destinationLongitude)
  );
  const etaMinutes = Math.max(1, Math.round((totalKm / ASSUMED_SPEED_KMH) * 60));
  const arrival = ride.departure.add(etaMinutes, "minute");
  const isFreeRide = isPassenger && Number(ride.totalAmount) === 0;

  return (
    <div className="urb-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="urb-top">
        <span className={`urb-status-pill${isLive ? " is-live" : ""}`}>
          {isLive ? <span className="urb-live-dot" /> : <ClockCircleOutlined />}
          {isLive ? "Live now" : "Upcoming"}
        </span>
        <span className="urb-countdown">{isLive ? "In progress" : formatCountdown(ride.departure)}</span>
      </div>

      <div className="urb-body">
        <div className="urb-info">
          <div className="urb-timeline">
            <div className="urb-timeline-track" />
            <div className="urb-stop">
              <span className="urb-stop-dot start" />
              <div className="urb-stop-text">
                <div className="urb-stop-row">
                  <strong>{ride.departure.format("h:mm A")}</strong>
                  <span className="urb-stop-head">{source.head}</span>
                </div>
                <span className="urb-stop-sub">{source.rest}</span>
              </div>
            </div>
            <div className="urb-stop">
              <span className="urb-stop-dot end" />
              <div className="urb-stop-text">
                <div className="urb-stop-row">
                  <strong>{arrival.format("h:mm A")}</strong>
                  <span className="urb-stop-head">{destination.head}</span>
                </div>
                <span className="urb-stop-sub">{destination.rest}</span>
              </div>
            </div>
          </div>

          <div className="urb-chips">
            <span className="urb-chip">
              <RiseOutlined /> {totalKm.toFixed(1)} km
            </span>
            <span className="urb-chip">
              <ClockCircleOutlined /> {etaMinutes} min
            </span>
            <span className="urb-chip">
              <TeamOutlined /> {ride.seats} seat{ride.seats === 1 ? "" : "s"}
            </span>
            {isPassenger && (
              <span className="urb-chip">
                <WalletOutlined /> {isFreeRide ? "Free" : `₹${ride.totalAmount}`}
              </span>
            )}
          </div>
        </div>

        <div className="urb-map">
          <RideMiniMap
            ride={{
              sourceLatitude: ride.sourceLatitude,
              sourceLongitude: ride.sourceLongitude,
              destinationLatitude: ride.destinationLatitude,
              destinationLongitude: ride.destinationLongitude,
            }}
            showChips={false}
          />
        </div>
      </div>

      <div className="urb-person">
        {isPassenger ? (
          <>
            <Avatar size={32} className="urb-avatar" icon={<UserOutlined />}>
              {ride.rider?.firstName?.[0]}
            </Avatar>
            <div className="urb-person-info">
              <div className="urb-person-name">
                {ride.rider?.firstName} {ride.rider?.lastName}
              </div>
              <div className="urb-person-meta">
                <span>
                  <StarFilled /> {ride.rider?.rating ?? "New"}
                </span>
                {ride.vehicle && (
                  <span>
                    <CarOutlined /> {ride.vehicle.brand} {ride.vehicle.model} · {ride.vehicle.registrationNumber}
                  </span>
                )}
              </div>
            </div>
            <span className="urb-role-tag">You're riding</span>
          </>
        ) : (
          <>
            <div className="urb-avatar urb-avatar-you">
              <CarOutlined />
            </div>
            <div className="urb-person-info">
              <div className="urb-person-name">You're driving</div>
              {ride.vehicle && (
                <div className="urb-person-meta">
                  <span>
                    <CarOutlined /> {ride.vehicle.brand} {ride.vehicle.model}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isLive && (
        <div className="urb-live-gap">
          <ThunderboltFilled />
          {gapKm != null
            ? `Rider is ${gapKm.toFixed(1)} km ${isPassenger ? "from you" : "from destination"}`
            : "Locating rider…"}
        </div>
      )}

      <div className="urb-cta-wrap">
        <button
          type="button"
          className="urb-cta"
          onClick={(event) => {
            event.stopPropagation();
            navigate(ride.linkTo);
          }}
        >
          {isLive ? "Track Live" : "View Details"} <ArrowRightOutlined />
        </button>
      </div>

      <CardStyles />
    </div>
  );
}

// A gold-on-espresso "premium" palette, scoped entirely to this card (the
// rest of the app keeps its teal identity) - shared between the full and
// compact variants above so both stay in sync.
function CardStyles() {
  return (
    <style>{`
      .urb-card{position:relative;padding:12px;border-radius:18px;background:linear-gradient(160deg,#141a24,#0a0d13);border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 26px rgba(0,0,0,.4);cursor:pointer;display:flex;flex-direction:column;gap:10px;transform-origin:center;transition:border-color .35s cubic-bezier(.4,0,.2,1),box-shadow .35s cubic-bezier(.4,0,.2,1);height:100%}
      .urb-card:not(.urb-compact):hover{border-color:rgba(255,255,255,.16);box-shadow:0 24px 50px rgba(0,0,0,.55)}

      .urb-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .urb-status-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:rgba(212,162,76,.16);color:#E8C77C;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;transition:background .3s ease}
      .urb-status-pill.is-live{background:rgba(34,197,94,0.18);color:#4ADE80}
      .urb-live-dot{width:7px;height:7px;border-radius:50%;background:#4ADE80;box-shadow:0 0 0 4px rgba(74,222,128,.18);animation:urbPulse 1.6s infinite}
      @keyframes urbPulse{0%,100%{opacity:1}50%{opacity:.35}}
      .urb-countdown{font-family:Georgia,'Times New Roman',serif;font-size:11.5px;font-weight:700;color:#C9AE8C}

      .urb-body{display:flex;gap:14px;align-items:stretch}
      .urb-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px;justify-content:space-between}

      .urb-timeline{position:relative;display:flex;flex-direction:column;gap:12px}
      .urb-stop{position:relative;display:flex;align-items:flex-start;gap:10px;z-index:1}
      .urb-stop-dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex-shrink:0;transition:box-shadow .3s ease}
      .urb-stop-dot.start{background:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.22)}
      .urb-stop-dot.end{background:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.22)}
      .urb-card:hover .urb-stop-dot.start{box-shadow:0 0 0 5px rgba(37,99,235,.28)}
      .urb-card:hover .urb-stop-dot.end{box-shadow:0 0 0 5px rgba(15,118,110,.28)}
      /* Positioned absolutely so it always spans exactly from the first dot's
         center to the last one's, no matter how tall the address text between
         them grows - a fixed-height div here would come up short and vanish
         before reaching the bottom dot. */
      .urb-timeline-track{position:absolute;left:4px;top:9px;bottom:9px;width:1px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.3) 0 4px,transparent 4px 8px)}
      .urb-stop-text{min-width:0;flex:1}
      .urb-stop-row{display:flex;align-items:baseline;gap:8px;min-width:0}
      .urb-stop-row strong{font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#F3E9DA;flex-shrink:0}
      .urb-stop-head{font-size:13px;font-weight:700;color:#F3E9DA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .urb-stop-sub{display:block;font-size:11px;color:#8C7355;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}

      .urb-chips{display:flex;flex-wrap:wrap;gap:6px}
      .urb-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(212,162,76,.08);border:1px solid rgba(212,162,76,.16);color:#D9C3A3;font-size:10px;font-weight:700;transition:background .3s ease,border-color .3s ease}
      .urb-chip svg{color:#D4A24C}
      .urb-card:hover .urb-chip{background:rgba(212,162,76,.14);border-color:rgba(212,162,76,.28)}

      .urb-map{flex:0 0 auto;width:34%;max-width:125px;border-radius:12px;overflow:hidden}

      .urb-person{display:flex;align-items:center;gap:8px;padding-top:9px;border-top:1px solid rgba(212,162,76,.16)}
      .urb-avatar{background:linear-gradient(135deg,#D4A24C,#8B5E34)!important;color:#2a1a08!important;flex-shrink:0;font-weight:800}
      .urb-avatar-you{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(212,162,76,.18);color:#E8C77C;flex-shrink:0;font-size:13px}
      .urb-person-info{flex:1;min-width:0}
      .urb-person-name{font-size:13px;font-weight:750;color:#F3E9DA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .urb-person-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:2px;font-size:11px;color:#B79C7A}
      .urb-person-meta span{display:inline-flex;align-items:center;gap:5px;min-width:0}
      .urb-person-meta svg{color:#8C7355;flex-shrink:0}
      .urb-role-tag{flex-shrink:0;padding:4px 10px;border-radius:999px;background:rgba(212,162,76,.16);color:#E8C77C;font-size:10px;font-weight:800}

      .urb-live-gap{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:12px;background:rgba(34,197,94,0.12);color:#4ADE80;font-size:12px;font-weight:700}

      .urb-cta{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:34px;border:0;border-radius:9px;background:linear-gradient(135deg,#E8C77C,#C9922E);color:#2a1a08;font-size:12px;font-weight:800;cursor:pointer;transition:filter .25s ease}
      .urb-cta:hover{filter:brightness(1.08)}

      /* Only hide-until-hover on devices that actually have a mouse -
         on touch, the whole card is already tappable so the button just
         stays visible instead of being permanently unreachable. */
      @media (hover:hover) and (pointer:fine){
        .urb-cta-wrap{max-height:0;opacity:0;transform:translateY(-4px);overflow:hidden;pointer-events:none;transition:max-height .35s cubic-bezier(.4,0,.2,1),opacity .25s ease,transform .3s ease}
        .urb-card:hover .urb-cta-wrap,
        .urb-card:focus-within .urb-cta-wrap{max-height:44px;opacity:1;transform:translateY(0);pointer-events:auto}
      }

      /* Compact "cover" variant used for unfocused coverflow slides. */
      .urb-compact{justify-content:center;gap:8px;padding:14px;align-items:flex-start}
      .urb-compact-route{display:flex;align-items:center;gap:7px;font-family:Georgia,'Times New Roman',serif;font-size:13.5px;font-weight:700;color:#F3E9DA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      .urb-compact-route svg{color:#D4A24C;font-size:10px;flex-shrink:0}
      .urb-compact-route strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .urb-compact-meta{display:flex;align-items:center;justify-content:space-between;width:100%;font-size:11px;color:#B79C7A;font-weight:700}

      /* A little extra breathing room on phones/narrow windows - the base
         12px padding was tuned for a genuinely wide desktop card and reads
         as cramped once the card itself shrinks down to compact/mobile size. */
      @media (max-width:812px){
        .urb-card{padding:16px}
        .urb-compact{padding:15px}
      }

      @media (max-width:520px){
        .urb-map{width:34%}
        .urb-stop-row{flex-direction:column;gap:1px}
      }
    `}</style>
  );
}
