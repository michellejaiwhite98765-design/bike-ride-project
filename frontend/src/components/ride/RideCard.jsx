import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Progress } from "antd";
import { UserOutlined, StarFilled, EnvironmentOutlined, ClockCircleOutlined, CarOutlined, ArrowRightOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import StatusTag from "../StatusTag.jsx";
import RideMiniMap from "./RideMiniMap.jsx";
import RideDetailsModal from "./RideDetailsModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RideCard({ ride, showMatch = false }) {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isFree = ride.rideType === "WITHOUT_TIP";
  const isOwner = user ? ride.riderId === user.id : false;

  const stopPropagation = (event) => event.stopPropagation();

  return (
    <>
      <article
        className="rc-card"
        role="button"
        tabIndex={0}
        onClick={() => setDetailsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setDetailsOpen(true);
        }}
      >
        <div className="rc-top">
          <div className="rc-person">
            <Avatar size={44} className="rc-avatar" icon={<UserOutlined />}>
              {ride.rider?.firstName?.[0]}
            </Avatar>
            <div>
              <div className="rc-name">
                {ride.rider?.firstName} {ride.rider?.lastName}
              </div>
              <div className="rc-rating">
                <StarFilled /> {ride.rider?.rating ?? "New"}
              </div>
            </div>
          </div>
          <StatusTag status={ride.status} />
        </div>

        <div className="rc-route">
          <EnvironmentOutlined />
          <span className="rc-route-text">
            {ride.sourceName} <ArrowRightOutlined className="rc-route-arrow" /> {ride.destinationName}
          </span>
        </div>

        <div className="rc-meta">
          <span>
            <ClockCircleOutlined /> {dayjs(ride.departureDate).format("DD MMM YYYY")} · {ride.departureTime}
          </span>
          <span>
            <CarOutlined /> {ride.vehicle?.brand} {ride.vehicle?.model}
          </span>
          <span>
            <TeamOutlined /> {ride.availableSeats} seat(s) left
          </span>
        </div>

        <div className="rc-map">
          <RideMiniMap ride={ride} />
        </div>

        {showMatch && typeof ride.matchPercentage === "number" && (
          <div className="rc-match">
            <div className="rc-match-label">Match {ride.matchPercentage}%</div>
            <Progress percent={ride.matchPercentage} showInfo={false} strokeColor="#2DD4BF" trailColor="rgba(255,255,255,.08)" size="small" />
          </div>
        )}

        <div className="rc-footer">
          <div className="rc-price">
            {isFree ? <StatusTag status="NOT_REQUIRED" /> : <span>Tip ₹{ride.tipAmount}</span>}
          </div>
          <Link to={`/rides/${ride.id}`} className="rc-view-link" onClick={stopPropagation}>
            View full details <ArrowRightOutlined />
          </Link>
        </div>
      </article>

      <RideDetailsModal ride={ride} open={detailsOpen} onClose={() => setDetailsOpen(false)} isOwner={isOwner} />

      <style>{`
        .rc-card{background:#0F172A;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;box-shadow:0 10px 26px rgba(0,0,0,.35);transition:box-shadow .2s ease,transform .2s ease,border-color .2s ease;cursor:pointer;display:flex;flex-direction:column;gap:12px;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
        .rc-card:hover{box-shadow:0 18px 40px rgba(0,0,0,.5);transform:translateY(-3px);border-color:rgba(255,255,255,.16)}
        .rc-card:active{transform:translateY(-1px) scale(.995)}
        .rc-card:focus-visible{outline:2px solid #2DD4BF;outline-offset:2px}

        .rc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
        .rc-person{display:flex;gap:10px;min-width:0}
        .rc-avatar{background:#0f766e;flex-shrink:0}
        .rc-name{font-weight:700;font-size:14px;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
        .rc-rating{color:#94A3B8;font-size:12px;display:flex;align-items:center;gap:4px}
        .rc-rating svg{color:#faad14}

        .rc-route{display:flex;align-items:center;gap:8px;font-weight:650;font-size:14px;color:#F1F5F9}
        .rc-route svg{color:#2DD4BF;flex-shrink:0}
        .rc-route-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
        .rc-route-arrow{font-size:11px;color:#64748b;flex-shrink:0}

        .rc-meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:#94A3B8;font-size:12.5px}
        .rc-meta span{display:inline-flex;align-items:center;gap:6px}
        .rc-meta svg{color:#64748b}

        .rc-map{cursor:default}

        .rc-match{margin-top:-2px}
        .rc-match-label{font-size:12px;color:#94A3B8;margin-bottom:4px}

        .rc-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:2px;border-top:1px solid rgba(255,255,255,.06)}
        .rc-price span{font-weight:700;color:#2DD4BF;font-size:13.5px}
        .rc-view-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:12.5px;color:#2DD4BF;white-space:nowrap}
        .rc-view-link:hover{color:#5EEAD4;text-decoration:underline}

        @media (max-width:480px){
          .rc-card{padding:13px;border-radius:14px}
          .rc-name{max-width:130px;font-size:13px}
          .rc-route{font-size:13px}
          .rc-meta{font-size:11.5px}
          .rc-footer{flex-direction:column;align-items:stretch;gap:8px}
          .rc-view-link{justify-content:center;padding:8px 0;border-radius:9px;background:rgba(45,212,191,.1)}
        }
      `}</style>
    </>
  );
}
