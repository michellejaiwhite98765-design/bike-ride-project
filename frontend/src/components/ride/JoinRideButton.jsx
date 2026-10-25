import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button } from "antd";
import { CheckCircleFilled, SendOutlined, CarOutlined } from "@ant-design/icons";
import { rideService } from "../../services/rideService.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * "Request to join" for a ride, used on ride cards, map popups and the ride
 * details modal. Once a request is sent (or the search results say one is
 * already pending) it turns into a "Requested" pill.
 *
 * With `pickup` and `drop` ({ name, latitude, longitude }, e.g. from the Find
 * trip search) the request is sent right here - after showing the extra fare
 * when the pickup is a detour. Without them it opens the ride page with the
 * request form, where the passenger picks their points.
 */
export default function JoinRideButton({ ride, pickup, drop, size = "middle", block = false, onRequested }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [request, setRequest] = useState(ride.myRequest ?? null);
  const [sending, setSending] = useState(false);

  useEffect(() => setRequest(ride.myRequest ?? null), [ride.myRequest]);

  if (!user || ride.riderId === user.id) return null;

  const stop = (event) => event.stopPropagation();

  if (request?.status === "ACCEPTED") {
    return (
      <Button size={size} block={block} className="jrb jrb-accepted" icon={<CarOutlined />}
        onClick={(e) => { stop(e); navigate("/bookings"); }}>
        Accepted
        <JoinButtonStyles />
      </Button>
    );
  }
  if (request?.status === "REQUESTED") {
    return (
      <Button size={size} block={block} className="jrb jrb-requested" icon={<CheckCircleFilled />}
        onClick={(e) => { stop(e); navigate(`/rides/${ride.id}`); }}
        title="Waiting for the rider to accept - open the ride to withdraw">
        Requested
        <JoinButtonStyles />
      </Button>
    );
  }
  if (ride.status !== "PUBLISHED" || Number(ride.availableSeats) < 1) return null;

  async function send() {
    setSending(true);
    try {
      const created = await rideService.createRequest(ride.id, {
        pickupName: pickup.name || "Pickup",
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropName: drop.name || "Drop",
        dropLatitude: drop.latitude,
        dropLongitude: drop.longitude,
        seatsRequested: 1,
      });
      setRequest({ id: created.id, status: created.status || "REQUESTED" });
      message.success("Request sent to the rider");
      onRequested?.(created);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSending(false);
    }
  }

  async function onClick(event) {
    stop(event);
    if (!pickup || !drop) {
      navigate(`/rides/${ride.id}`, { state: { openRequest: true } });
      return;
    }
    setSending(true);
    let zone;
    try {
      zone = await rideService.joinCheck(ride.id, {
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropLatitude: drop.latitude,
        dropLongitude: drop.longitude,
      });
    } catch (err) {
      setSending(false);
      message.error(err.message);
      return;
    }
    setSending(false);
    if (zone.zone === "TOO_FAR") {
      message.error(zone.message);
      return;
    }
    if (zone.zone === "DETOUR") {
      modal.confirm({
        title: `Detour pickup · +₹${zone.extraTip}`,
        content: zone.message,
        okText: `Request for +₹${zone.extraTip}`,
        onOk: send,
      });
      return;
    }
    send();
  }

  return (
    <Button size={size} block={block} type="primary" className="jrb jrb-join" icon={<SendOutlined />} loading={sending} onClick={onClick}>
      Request to join
      <JoinButtonStyles />
    </Button>
  );
}

function JoinButtonStyles() {
  return (
    <style>{`
      .jrb{border-radius:999px!important;font-weight:700!important}
      .jrb-join{background:linear-gradient(135deg,#2DD4BF,#8B5CF6)!important;border:none!important;box-shadow:0 6px 18px rgba(45,212,191,.28)}
      .jrb-requested{background:rgba(45,212,191,.12)!important;border:1px solid rgba(45,212,191,.45)!important;color:#2DD4BF!important}
      .jrb-requested:hover{background:rgba(45,212,191,.2)!important}
      .jrb-accepted{background:rgba(34,197,94,.14)!important;border:1px solid rgba(34,197,94,.45)!important;color:#22c55e!important}
    `}</style>
  );
}
