import { Link } from "react-router-dom";
import { Modal, Button, Avatar } from "antd";
import { CarOutlined, EnvironmentOutlined, CalendarOutlined, TeamOutlined, WalletOutlined, ArrowRightOutlined, UserOutlined, StarFilled, PhoneOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import LiveTrackingMap from "./LiveTrackingMap.jsx";
import RouteOverviewMap from "./RouteOverviewMap.jsx";
import StatusTag from "../StatusTag.jsx";
import { VerifiedBadge } from "../ui/index.js";
import { haversineKm } from "../../utils/geo.js";

const dark = {
  panel: "rgba(255,255,255,0.045)",
  panelBorder: "rgba(255,255,255,0.09)",
  textPrimary: "#F1F5F9",
  textTertiary: "#64748B",
  teal: "#2DD4BF",
};

export default function RideDetailsModal({ ride, open, onClose, isOwner }) {
  if (!ride) return null;

  const distanceKm = haversineKm(
    Number(ride.sourceLatitude),
    Number(ride.sourceLongitude),
    Number(ride.destinationLatitude),
    Number(ride.destinationLongitude)
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={640} className="ride-details-modal" destroyOnClose>
      <div className="rdm-header">
        <div className="rdm-title">
          <CarOutlined /> Ride details
        </div>
        <StatusTag status={ride.status} />
      </div>

      <div className="rdm-rider">
        <Avatar size={48} className="rdm-rider-avatar" icon={<UserOutlined />}>
          {ride.rider?.firstName?.[0]}
        </Avatar>
        <div className="rdm-rider-info">
          <div className="rdm-rider-name">
            {ride.rider?.firstName} {ride.rider?.lastName}
            {ride.rider?.isVerified && <VerifiedBadge />}
          </div>
          <div className="rdm-rider-rating">
            <StarFilled /> {ride.rider?.rating ?? "New"}
          </div>
        </div>
        {ride.rider?.phone && (
          <a className="rdm-rider-call" href={`tel:${ride.rider.phone}`} onClick={(e) => e.stopPropagation()}>
            <PhoneOutlined /> {ride.rider.phone}
          </a>
        )}
      </div>

      <div className="rdm-map">
        {ride.status === "STARTED" ? (
          <LiveTrackingMap ride={ride} isOwner={isOwner} compact />
        ) : (
          <RouteOverviewMap ride={ride} compact />
        )}
      </div>

      <div className="rdm-section">
        <div className="rdm-section-title">
          <CarOutlined /> Vehicle status
          {ride.vehicle?.verificationStatus === "VERIFIED" && <VerifiedBadge />}
        </div>
        <div className="rdm-grid">
          <div className="rdm-cell">
            <span>Vehicle</span>
            <strong>{ride.vehicle?.brand} {ride.vehicle?.model}</strong>
          </div>
          <div className="rdm-cell">
            <span>Plate</span>
            <strong>{ride.vehicle?.registrationNumber || "—"}</strong>
          </div>
          <div className="rdm-cell">
            <span>Type &amp; color</span>
            <strong style={{ textTransform: "capitalize" }}>{ride.vehicle?.vehicleType?.toLowerCase()} · {ride.vehicle?.color}</strong>
          </div>
          <div className="rdm-cell">
            <span>Verification</span>
            <strong><StatusTag status={ride.vehicle?.verificationStatus} /></strong>
          </div>
        </div>
      </div>

      <div className="rdm-section">
        <div className="rdm-section-title">
          <EnvironmentOutlined /> Route
        </div>
        <div className="rdm-grid">
          <div className="rdm-cell">
            <span>Start</span>
            <strong>{ride.sourceName}</strong>
          </div>
          <div className="rdm-cell">
            <span>End</span>
            <strong>{ride.destinationName}</strong>
          </div>
          <div className="rdm-cell">
            <span><CalendarOutlined /> Departure</span>
            <strong>{dayjs(ride.departureDate).format("DD MMM YYYY")} · {ride.departureTime}</strong>
          </div>
          <div className="rdm-cell">
            <span>Distance</span>
            <strong>{Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : "—"}</strong>
          </div>
          <div className="rdm-cell">
            <span><TeamOutlined /> Seats</span>
            <strong>{ride.availableSeats}/{ride.totalSeats}</strong>
          </div>
          <div className="rdm-cell">
            <span><WalletOutlined /> Payment</span>
            <strong>{ride.rideType === "WITHOUT_TIP" ? "No tip" : `₹${ride.tipAmount}`}</strong>
          </div>
        </div>
      </div>

      <Link to={`/rides/${ride.id}`}>
        <Button type="primary" block icon={<ArrowRightOutlined />} className="rdm-full-btn">
          View full details
        </Button>
      </Link>

      <style>{`
        .ride-details-modal .ant-modal-mask{background:rgba(2,4,10,.72)!important;backdrop-filter:blur(6px)}
        .ride-details-modal .ant-modal-content{transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s ease}
        .ride-details-modal .ant-modal-container,
        .ride-details-modal .ant-modal-content{background:#05070d!important;border:1px solid ${dark.panelBorder};border-radius:20px;padding:20px!important}
        .ride-details-modal .ant-modal-close{color:${dark.textTertiary}}
        .ride-details-modal .ant-modal-close:hover{color:${dark.textPrimary}}
        .rdm-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .rdm-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:${dark.textPrimary}}
        .rdm-rider{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:${dark.panel};border:1px solid ${dark.panelBorder};margin-bottom:14px}
        .rdm-rider-avatar{background:linear-gradient(135deg,${dark.teal},#60A5FA)!important;color:#04110f!important;flex-shrink:0}
        .rdm-rider-info{flex:1;min-width:0}
        .rdm-rider-name{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:750;color:${dark.textPrimary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rdm-rider-rating{display:flex;align-items:center;gap:5px;font-size:12px;color:${dark.textTertiary};margin-top:2px}
        .rdm-rider-rating svg{color:#faad14}
        .rdm-rider-call{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.3);color:${dark.teal};font-size:12.5px;font-weight:700;white-space:nowrap;flex-shrink:0}
        .rdm-rider-call:hover{background:rgba(45,212,191,.2);color:#fff}
        .rdm-map{border-radius:14px;overflow:hidden;margin-bottom:16px;border:1px solid ${dark.panelBorder}}
        .rdm-map .live-tracking-card{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important}
        .rdm-map .ant-card-body{padding:0!important}
        .rdm-section{margin-bottom:16px;padding:14px;border-radius:14px;background:${dark.panel};border:1px solid ${dark.panelBorder}}
        .rdm-section-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:${dark.teal};margin-bottom:12px}
        .rdm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .rdm-cell span{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:${dark.textTertiary};margin-bottom:3px}
        .rdm-cell strong{display:block;font-size:13px;font-weight:700;color:${dark.textPrimary}}
        .rdm-full-btn{height:44px;border-radius:10px;background:linear-gradient(135deg,#2DD4BF,#8B5CF6)!important;border:none!important;font-weight:700}
        @media (max-width:520px){.rdm-grid{grid-template-columns:1fr}.rdm-rider{flex-wrap:wrap}.rdm-rider-call{width:100%;justify-content:center}}
      `}</style>
    </Modal>
  );
}
