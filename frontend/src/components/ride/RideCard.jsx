import { Link } from "react-router-dom";
import { Card, Avatar, Button, Progress } from "antd";
import { UserOutlined, StarFilled, EnvironmentOutlined, ClockCircleOutlined, CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import StatusTag from "../StatusTag.jsx";

const Route = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin: 8px 0;
`;

const Meta = styled.div`
  color: #64748b;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
`;

export default function RideCard({ ride, showMatch = false }) {
  const isFree = ride.rideType === "WITHOUT_TIP";

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Avatar size={44} style={{ background: "#0f766e" }} icon={<UserOutlined />}>
            {ride.rider?.firstName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {ride.rider?.firstName} {ride.rider?.lastName}
            </div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              <StarFilled style={{ color: "#faad14" }} /> {ride.rider?.rating ?? "New"}
            </div>
          </div>
        </div>
        <StatusTag status={ride.status} />
      </div>

      <Route>
        <EnvironmentOutlined style={{ color: "#0f766e" }} />
        {ride.sourceName} → {ride.destinationName}
      </Route>

      <Meta>
        <span>
          <ClockCircleOutlined /> {dayjs(ride.departureDate).format("DD MMM YYYY")} at {ride.departureTime}
        </span>
        <span>
          <CarOutlined /> {ride.vehicle?.brand} {ride.vehicle?.model} · {ride.availableSeats} seat(s) available
        </span>
      </Meta>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {isFree ? (
            <StatusTag status="NOT_REQUIRED" />
          ) : (
            <span style={{ fontWeight: 600, color: "#0f766e" }}>Tip ₹{ride.tipAmount}</span>
          )}
        </div>
        <Link to={`/rides/${ride.id}`}>
          <Button type="primary" style={{ background: "#0f766e" }}>
            View Ride
          </Button>
        </Link>
      </div>

      {showMatch && typeof ride.matchPercentage === "number" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Match {ride.matchPercentage}%</div>
          <Progress percent={ride.matchPercentage} showInfo={false} strokeColor="#0f766e" size="small" />
        </div>
      )}
    </Card>
  );
}
