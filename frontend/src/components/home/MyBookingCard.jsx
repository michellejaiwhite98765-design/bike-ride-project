import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowRightOutlined, CheckCircleFilled, ClockCircleOutlined, CreditCardOutlined } from "@ant-design/icons";
import { bookingService } from "../../services/bookingService.js";
import { connectSocket } from "../../services/socket.js";
import { onTripChanged } from "../../services/tripEvents.js";

const ACTIVE_RIDE = ["PUBLISHED", "STARTED"];

/** A passenger's booking that's still to happen: accepted (paid or not) on a ride that hasn't finished. */
export function isActiveBooking(b) {
  return ["PAYMENT_PENDING", "CONFIRMED"].includes(b.bookingStatus) && ACTIVE_RIDE.includes(b.ride?.status) && b.boardingStatus !== "DROPPED";
}

/**
 * The signed-in passenger's active bookings, kept fresh: reloads on any
 * notification (accepted, payment, ride started/cancelled...) and on the
 * user's own trip actions.
 */
export function useActiveBookings(enabled) {
  const [bookings, setBookings] = useState([]);
  const load = useCallback(() => {
    if (!enabled) return setBookings([]);
    bookingService
      .listMine()
      .then((list) => setBookings((Array.isArray(list) ? list : []).filter(isActiveBooking)))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    load();
    if (!enabled) return undefined;
    const socket = connectSocket();
    socket.on("notification:new", load);
    const offTrip = onTripChanged(load);
    return () => {
      socket.off("notification:new", load);
      offTrip();
    };
  }, [enabled, load]);

  return bookings;
}

/** "Your ride" card(s) for a passenger: where the accepted ride goes, and Pay now when payment is due. */
export default function MyBookingCard({ bookings, floating = false }) {
  if (!bookings?.length) return null;
  return (
    <div className={`mbc-list${floating ? " mbc-floating" : ""}`}>
      {bookings.map((b) => {
        const ride = b.ride || {};
        const due = b.bookingStatus === "PAYMENT_PENDING";
        const started = ride.status === "STARTED";
        return (
          <div key={b.id} className={`mbc-card${due ? " is-due" : ""}`}>
            <div className="mbc-head">
              <span className="mbc-tag">
                {due ? <><ClockCircleOutlined /> Accepted · payment due</> : started ? <><CheckCircleFilled /> Ride under way</> : <><CheckCircleFilled /> Seat confirmed</>}
              </span>
              <span className="mbc-when">{dayjs(ride.departureDate).format("DD MMM")} · {ride.departureTime}</span>
            </div>
            <div className="mbc-route">
              <strong>{ride.sourceName?.split(",")[0]}</strong>
              <ArrowRightOutlined />
              <strong>{ride.destinationName?.split(",")[0]}</strong>
            </div>
            <div className="mbc-actions">
              {due ? (
                <Link to={`/bookings/${b.id}`} state={{ pay: true }} className="mbc-btn mbc-btn-pay">
                  <CreditCardOutlined /> Pay ₹{Number(b.totalAmount)} now
                </Link>
              ) : (
                <Link to={`/bookings/${b.id}`} className="mbc-btn">View booking</Link>
              )}
              <Link to={`/rides/${b.rideId || ride.id}`} className="mbc-btn mbc-btn-ghost">Ride details</Link>
            </div>
          </div>
        );
      })}
      <style>{`
        .mbc-list{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
        .mbc-floating{position:absolute;z-index:600;left:12px;right:12px;bottom:24px;margin:0;max-width:460px}
        @media(max-width:768px){.mbc-floating{bottom:calc(84px + env(safe-area-inset-bottom))}.hmv-shell:has(.mbc-floating) .leaflet-control-zoom{display:none}}
        .mbc-card{padding:12px 14px;border-radius:16px;background:var(--bg-secondary);border:1px solid var(--chrome-border);box-shadow:0 10px 26px rgba(0,0,0,.35)}
        .mbc-card.is-due{border-color:#f59e0b}
        .mbc-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .mbc-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#2DD4BF;text-transform:uppercase;letter-spacing:.4px}
        .is-due .mbc-tag{color:#f59e0b}
        .mbc-when{font-size:11px;color:var(--text-secondary);font-weight:600;white-space:nowrap}
        .mbc-route{display:flex;align-items:center;gap:8px;margin:6px 0 10px;color:var(--text-primary);font-size:15px;min-width:0}
        .mbc-route strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mbc-route .anticon{color:var(--text-secondary);font-size:12px;flex:0 0 auto}
        .mbc-actions{display:flex;gap:8px}
        .mbc-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 10px;border-radius:12px;background:#2DD4BF;color:#04211d!important;font-weight:800;font-size:13px;text-decoration:none}
        .mbc-btn-pay{background:#f59e0b;color:#fff!important}
        .mbc-btn-ghost{flex:0 0 auto;background:transparent;border:1px solid var(--chrome-border);color:var(--text-primary)!important}
      `}</style>
    </div>
  );
}
