import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AimOutlined } from "@ant-design/icons";
import LiveTrackingMap from "./LiveTrackingMap.jsx";
import { rideService } from "../../services/rideService.js";
import { bookingService } from "../../services/bookingService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { connectSocket } from "../../services/socket.js";
import { onTripChanged } from "../../services/tripEvents.js";

const POLL_MS = 30000;
// Sign-in / sign-up screens: never show live tracking there.
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
// Notifications that mean someone's current trip started or ended.
const TRIP_NOTIFICATIONS = ["RIDE_STARTED", "RIDE_COMPLETED", "RIDE_CANCELLED", "RIDE_EXPIRED", "PASSENGER_DROPPED", "BOOKING_CANCELLED", "PAYMENT_SUCCESS"];

/**
 * The user's ride that is under way right now, if any: their own STARTED ride
 * (rider), or a STARTED ride they hold a confirmed booking on and haven't been
 * dropped off from yet (passenger).
 */
async function findCurrentRide() {
  const [mine, bookings] = await Promise.all([
    rideService.listMine().catch(() => []),
    bookingService.listMine().catch(() => []),
  ]);
  const own = (Array.isArray(mine) ? mine : []).find((r) => r.status === "STARTED");
  if (own) return { ride: own, isOwner: true };
  const booking = (Array.isArray(bookings) ? bookings : []).find(
    (b) => b.bookingStatus === "CONFIRMED" && b.ride?.status === "STARTED" && b.boardingStatus !== "DROPPED"
  );
  return booking ? { ride: booking.ride, isOwner: false } : null;
}

/** Floating "Live track" button while a ride is under way; opens full-screen tracking. */
export default function CurrentRideTracker() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);

  // Re-check on every page change and every 30s, and straight away when this
  // user starts/ends a trip or is told the other side did - so the button only
  // shows while there really is a ride under way.
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrent(null);
      return undefined;
    }
    let cancelled = false;
    const load = () => findCurrentRide().then((found) => !cancelled && setCurrent(found)).catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    const offTrip = onTripChanged(load);
    const socket = connectSocket();
    const onNotification = (n) => (!n?.type || TRIP_NOTIFICATIONS.includes(n.type)) && load();
    socket.on("notification:new", onNotification);
    return () => {
      cancelled = true;
      clearInterval(timer);
      offTrip();
      socket.off("notification:new", onNotification);
    };
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    if (!current) setOpen(false);
  }, [current]);

  // Full screen: no page scrolling behind the map, Escape closes it.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current || AUTH_PAGES.includes(pathname)) return null;

  return (
    <>
      {!open && (
        <button type="button" className="crt-fab" onClick={() => setOpen(true)} aria-label="Open live tracking">
          <span className="crt-fab-pulse" />
          <AimOutlined />
          <span className="crt-fab-label">Live track</span>
        </button>
      )}
      {open && <LiveTrackingMap ride={current.ride} isOwner={current.isOwner} fullscreen onClose={() => setOpen(false)} />}
      <style>{`
        .crt-fab{position:fixed;z-index:1200;right:18px;bottom:28px;display:flex;align-items:center;gap:8px;padding:12px 18px 12px 14px;border:0;border-radius:999px;cursor:pointer;background:linear-gradient(135deg,#2DD4BF,#0f766e);color:#fff;font-size:14px;font-weight:800;box-shadow:0 10px 26px rgba(15,118,110,.5)}
        .crt-fab .anticon{font-size:18px;position:relative;z-index:1}
        .crt-fab-label{position:relative;z-index:1}
        .crt-fab-pulse{position:absolute;inset:0;border-radius:999px;background:#2DD4BF;opacity:.5;animation:crtPulse 1.8s ease-out infinite}
        @keyframes crtPulse{0%{transform:scale(1);opacity:.45}100%{transform:scale(1.35,1.6);opacity:0}}
        @media(max-width:768px){.crt-fab{right:auto;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom))}}
      `}</style>
    </>
  );
}
