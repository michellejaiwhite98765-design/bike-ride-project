import { Link } from "react-router-dom";
import { Modal, Button } from "antd";
import { CarOutlined, EnvironmentOutlined, CalendarOutlined, TeamOutlined, WalletOutlined, ArrowRightOutlined } from "@ant-design/icons";
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
          <CarOutlined /> Vehicle &amp; route
        </div>
        <StatusTag status={ride.status} />
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
        .ride-details-modal .ant-modal-container,
        .ride-details-modal .ant-modal-content{background:#05070d!important;border:1px solid ${dark.panelBorder};border-radius:20px;padding:20px!important}
        .ride-details-modal .ant-modal-close{color:${dark.textTertiary}}
        .ride-details-modal .ant-modal-close:hover{color:${dark.textPrimary}}
        .rdm-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .rdm-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:${dark.textPrimary}}
        .rdm-map{border-radius:14px;overflow:hidden;margin-bottom:16px;border:1px solid ${dark.panelBorder}}
        .rdm-map .live-tracking-card{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important}
        .rdm-map .ant-card-body{padding:0!important}
        .rdm-section{margin-bottom:16px;padding:14px;border-radius:14px;background:${dark.panel};border:1px solid ${dark.panelBorder}}
        .rdm-section-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:${dark.teal};margin-bottom:12px}
        .rdm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .rdm-cell span{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:${dark.textTertiary};margin-bottom:3px}
        .rdm-cell strong{display:block;font-size:13px;font-weight:700;color:${dark.textPrimary}}
        .rdm-full-btn{height:44px;border-radius:10px;background:linear-gradient(135deg,#2DD4BF,#8B5CF6)!important;border:none!important;font-weight:700}
        @media (max-width:520px){.rdm-grid{grid-template-columns:1fr}}
      `}</style>
    </Modal>
  );
}
