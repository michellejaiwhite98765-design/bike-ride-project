import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, Avatar, Button, Skeleton, Modal, Form, App, Row, Col, Popconfirm, Alert, InputNumber, Input, Space, Divider } from "antd";
import { UserOutlined, StarFilled, EnvironmentOutlined, ClockCircleOutlined, CarOutlined, FlagOutlined, CheckCircleOutlined, PhoneOutlined, MessageOutlined, CompassOutlined, TeamOutlined, WalletOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { rideService } from "../../services/rideService.js";
import { safetyService } from "../../services/safetyService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusTag from "../../components/StatusTag.jsx";
import LocationPickerModal from "../../components/LocationPickerModal.jsx";
import LiveTrackingMap from "../../components/ride/LiveTrackingMap.jsx";
// import RouteOverviewMap from "../../components/ride/RouteOverviewMap.jsx";
import { VerifiedBadge, Badge } from "../../components/ui/index.js";
import RouteOverviewMap from "../../components/ride/RouteOverviewMap.jsx";
// import RouteOverviewMap from "../../components/ride/RouteOverviewMap.jsx";


// Dark "vibe" palette — scoped to this page only, doesn't touch the global light theme.
const dark = {
  bgGradient:
    "radial-gradient(ellipse 900px 520px at 12% -8%, rgba(45,212,191,0.16), transparent 60%)," +
    "radial-gradient(ellipse 820px 520px at 105% 4%, rgba(167,139,250,0.15), transparent 58%)," +
    "radial-gradient(ellipse 700px 420px at 50% 110%, rgba(96,165,250,0.10), transparent 60%)," +
    "#05070d",
  panel: "rgba(255,255,255,0.045)",
  panelBorder: "rgba(255,255,255,0.09)",
  divider: "rgba(255,255,255,0.08)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
  teal: "#2DD4BF",
  blue: "#60A5FA",
  purple: "#A78BFA",
};

const Stage = styled.div`
  margin: -24px -16px 0;
  padding: 32px 20px 60px;
  background: ${dark.bgGradient};
  min-height: calc(100vh - 64px - 70px + 48px);
  position: relative;

  @media (max-width: 768px) {
    margin: -16px -16px 0;
    padding: 24px 14px 150px;
  }
`;

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const MapSection = styled(Card)`
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid ${dark.panelBorder} !important;
  background: ${dark.panel} !important;
  backdrop-filter: blur(22px);
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);

  .ant-card-body {
    padding: 0;
  }

  .map-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${dark.divider};

    .map-header-title {
      font-size: 15px;
      font-weight: 800;
      color: ${dark.textPrimary};
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
`;

const DriverProfileCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid ${dark.panelBorder} !important;
  background: ${dark.panel} !important;
  backdrop-filter: blur(22px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
`;

const DriverHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .driver-avatar {
    width: 64px;
    height: 64px;
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(135deg, ${dark.teal}, ${dark.blue});
    color: #04110f;
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12), 0 10px 26px rgba(45, 212, 191, 0.25);
  }

  .driver-info {
    flex: 1;

    .name {
      font-size: 18px;
      font-weight: 700;
      color: ${dark.textPrimary};
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rating {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: ${dark.textSecondary};
    }
  }
`;

const SectionCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid ${dark.panelBorder} !important;
  background: ${dark.panel} !important;
  backdrop-filter: blur(22px);
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);

  .ant-card-body {
    padding: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${dark.divider};

    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: ${dark.textPrimary};
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .section-body {
    padding: 20px;
  }
`;

const RouteTimeline = styled.div`
  display: flex;
  flex-direction: column;

  .route-node {
    display: flex;
    gap: 14px;
    position: relative;

    .node-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;

      .node-dot {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 14px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
      }

      .node-line {
        width: 2px;
        flex: 1;
        min-height: 28px;
        margin: 4px 0;
        background: repeating-linear-gradient(180deg, ${dark.divider} 0 6px, transparent 6px 11px);
      }
    }

    .node-content {
      flex: 1;
      padding-bottom: 22px;
      min-width: 0;

      .node-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: ${dark.textTertiary};
        margin-bottom: 3px;
      }

      .node-value {
        font-size: 14px;
        font-weight: 700;
        color: ${dark.textPrimary};
        line-height: 1.4;
      }
    }

    &:last-child .node-content {
      padding-bottom: 0;
    }
  }

  .route-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
    padding-top: 16px;
    border-top: 1px dashed ${dark.divider};
  }

  .route-meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid ${dark.panelBorder};
    color: ${dark.textPrimary};
    font-size: 12px;
    font-weight: 700;
  }
`;

const InfoCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div`
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid ${dark.panelBorder};
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: rgba(45, 212, 191, 0.4);
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-1px);
  }

  .info-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: rgba(45, 212, 191, 0.14);
    color: ${dark.teal};
    font-size: 14px;
    margin-bottom: 10px;
  }

  .info-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: ${dark.textTertiary};
    margin-bottom: 4px;
  }

  .info-value {
    font-size: 14px;
    font-weight: 700;
    color: ${dark.textPrimary};
    line-height: 1.3;
  }

  .info-sub {
    font-size: 12px;
    color: ${dark.textSecondary};
    margin-top: 3px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${dark.divider};

  .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous) {
    background: rgba(255, 255, 255, 0.07) !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
    color: ${dark.textPrimary} !important;
  }

  .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous):hover {
    background: rgba(255, 255, 255, 0.12) !important;
    border-color: rgba(45, 212, 191, 0.45) !important;
    color: #fff !important;
  }

  .ant-btn-dangerous:not(.ant-btn-primary) {
    background: rgba(239, 68, 68, 0.1) !important;
    border-color: rgba(239, 68, 68, 0.4) !important;
    color: #fca5a5 !important;
  }

  .ant-btn-dangerous:not(.ant-btn-primary):hover {
    background: rgba(239, 68, 68, 0.18) !important;
    color: #fecaca !important;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    gap: 8px;
    padding: 16px;
    background: rgba(5, 7, 13, 0.92);
    backdrop-filter: blur(20px);
    border-top: 1px solid ${dark.divider};
    margin: 0;
    border-radius: 0;
    max-width: none;
    z-index: 200;
  }
`;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RideDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [requestForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRide(await rideService.getById(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !ride) {
    return (
      <Stage>
        <PageContainer>
          <div className="skeleton-dark">
            <Skeleton active avatar paragraph={{ rows: 5 }} />
          </div>
          <style>{`
            .skeleton-dark .ant-skeleton-title,
            .skeleton-dark .ant-skeleton-paragraph > li,
            .skeleton-dark .ant-skeleton-avatar {
              background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%) !important;
              background-size: 400% 100% !important;
            }
          `}</style>
        </PageContainer>
      </Stage>
    );
  }

  const isOwner = ride.riderId === user.id;
  const distanceKm = haversineKm(
    Number(ride.sourceLatitude),
    Number(ride.sourceLongitude),
    Number(ride.destinationLatitude),
    Number(ride.destinationLongitude)
  );
  const estimatedMinutes = Math.round((distanceKm / 25) * 60);

  async function handleRequestSubmit() {
    try {
      const values = await requestForm.validateFields();
      if (!values.pickupLatitude || !values.pickupLongitude) {
        message.error("Please select a pickup location");
        return;
      }
      if (!values.dropLatitude || !values.dropLongitude) {
        message.error("Please select a drop location");
        return;
      }
      setActionLoading(true);
      await rideService.createRequest(ride.id, values);
      message.success("Request sent to the rider");
      setRequestModalOpen(false);
      requestForm.resetFields();
      load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handlePickupConfirm(location) {
    requestForm.setFieldsValue({
      pickupName: location.name,
      pickupLatitude: location.latitude,
      pickupLongitude: location.longitude,
    });
    setPickupModalOpen(false);
  }

  function handleDropConfirm(location) {
    requestForm.setFieldsValue({
      dropName: location.name,
      dropLatitude: location.latitude,
      dropLongitude: location.longitude,
    });
    setDropModalOpen(false);
  }

  async function handleReportSubmit() {
    try {
      const values = await reportForm.validateFields();
      setActionLoading(true);
      await safetyService.createReport({ reportedUserId: ride.riderId, rideId: ride.id, ...values });
      message.success("Report submitted. Our team will review it.");
      setReportModalOpen(false);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runAction(fn, successMsg) {
    setActionLoading(true);
    try {
      await fn();
      message.success(successMsg);
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Stage>
      <PageContainer style={{ paddingBottom: "100px" }}>
          {/* Route / Live Tracking Map — always shown, live tracking kicks in once the ride starts */}
          {ride.status === "STARTED" ? (
            <LiveTrackingMap ride={ride} isOwner={isOwner} />
          ) : (
            <MapSection>
              <div className="map-header">
                <span className="map-header-title">
                  <EnvironmentOutlined style={{ color: dark.teal }} /> Route preview
                </span>
                <StatusTag status={ride.status} />
              </div>
              <RouteOverviewMap ride={ride} />
            </MapSection>
          )}

          {/* Driver Profile Section */}
          <DriverProfileCard>
            <DriverHeader>
              <Avatar className="driver-avatar" icon={<UserOutlined />}>
                {ride.rider?.firstName?.[0]}
              </Avatar>
              <div className="driver-info">
                <div className="name">
                  {ride.rider?.firstName} {ride.rider?.lastName}
                  {ride.rider?.isVerified && <VerifiedBadge />}
                </div>
                <div className="rating">
                  <StarFilled style={{ color: "#faad14" }} />
                  <span>{ride.rider?.rating ?? "New"}</span>
                  <span>·</span>
                  <span>{ride.rider?.numberOfRides ?? 0} rides</span>
                </div>
              </div>
              <StatusTag status={ride.status} />
            </DriverHeader>

            {ride.notes && (
              <div className="dark-alert">
                <Alert style={{ marginTop: 12 }} type="info" message="Notes from rider" description={ride.notes} showIcon />
              </div>
            )}
          </DriverProfileCard>

          {/* Route Details */}
          <SectionCard>
            <div className="section-header">
              <span className="section-title">
                <CompassOutlined style={{ color: dark.teal }} /> Route Details
              </span>
            </div>
            <div className="section-body">
              <RouteTimeline>
                <div className="route-node">
                  <div className="node-marker">
                    <div className="node-dot" style={{ background: "linear-gradient(135deg, #2563eb, #60a5fa)" }}>
                      <EnvironmentOutlined />
                    </div>
                    <div className="node-line" />
                  </div>
                  <div className="node-content">
                    <div className="node-label">Pickup</div>
                    <div className="node-value">{ride.sourceName}</div>
                  </div>
                </div>
                <div className="route-node">
                  <div className="node-marker">
                    <div className="node-dot" style={{ background: `linear-gradient(135deg, ${dark.teal}, #14b8a6)` }}>
                      <FlagOutlined />
                    </div>
                  </div>
                  <div className="node-content">
                    <div className="node-label">Drop-off</div>
                    <div className="node-value">{ride.destinationName}</div>
                  </div>
                </div>

                <div className="route-meta">
                  <span className="route-meta-chip">
                    <CompassOutlined /> {distanceKm.toFixed(1)} km
                  </span>
                  <span className="route-meta-chip">
                    <ClockCircleOutlined /> ~{estimatedMinutes} min
                  </span>
                  {ride.pickupPreference && (
                    <span className="route-meta-chip">
                      <TeamOutlined />
                      {ride.pickupPreference === "PASSENGER_LOCATION" ? "Door-to-door pickup" : "Pickup along the route"}
                    </span>
                  )}
                </div>
              </RouteTimeline>
            </div>
          </SectionCard>

          {/* Ride Information */}
          <SectionCard>
            <div className="section-header">
              <span className="section-title">
                <CarOutlined style={{ color: dark.teal }} /> Ride Information
              </span>
            </div>
            <div className="section-body">
              <InfoCardsGrid>
                <InfoCard>
                  <div className="info-icon">
                    <CalendarOutlined />
                  </div>
                  <div className="info-label">Departure</div>
                  <div className="info-value">{dayjs(ride.departureDate).format("DD MMM YYYY")}</div>
                  <div className="info-sub">{ride.departureTime}</div>
                </InfoCard>
                <InfoCard>
                  <div className="info-icon">
                    <ClockCircleOutlined />
                  </div>
                  <div className="info-label">Duration &amp; Distance</div>
                  <div className="info-value">~{estimatedMinutes} min</div>
                  <div className="info-sub">{distanceKm.toFixed(1)} km</div>
                </InfoCard>
                <InfoCard>
                  <div className="info-icon">
                    <CarOutlined />
                  </div>
                  <div className="info-label">Vehicle</div>
                  <div className="info-value">
                    {ride.vehicle?.brand} {ride.vehicle?.model}
                  </div>
                  <div className="info-sub">{ride.vehicle?.registrationNumber}</div>
                </InfoCard>
                <InfoCard>
                  <div className="info-icon">
                    <TeamOutlined />
                  </div>
                  <div className="info-label">Available Seats</div>
                  <div className="info-value">
                    <Badge type="info">
                      {ride.availableSeats}/{ride.totalSeats} seats
                    </Badge>
                  </div>
                </InfoCard>
                <InfoCard>
                  <div className="info-icon">
                    <WalletOutlined />
                  </div>
                  <div className="info-label">Payment</div>
                  <div className="info-value">
                    {ride.rideType === "WITHOUT_TIP" ? (
                      <Badge type="default">No tip</Badge>
                    ) : (
                      <span style={{ color: dark.teal }}>₹{ride.tipAmount}</span>
                    )}
                  </div>
                </InfoCard>
              </InfoCardsGrid>
            </div>
          </SectionCard>

          {/* Action Buttons */}
          <ActionButtons>
            {!isOwner && ride.status === "PUBLISHED" && (
              <Button
                type="primary"
                size="large"
                style={{
                  background: "linear-gradient(135deg, #2DD4BF, #8B5CF6)",
                  border: "none",
                  boxShadow: "0 10px 30px rgba(45, 212, 191, 0.3)",
                  fontWeight: 700,
                  flex: 1,
                }}
                onClick={() => setRequestModalOpen(true)}
              >
                Request to Join
              </Button>
            )}

            {isOwner && (
              <>
                {["DRAFT", "PUBLISHED"].includes(ride.status) && (
                  <Link to={`/rides/${ride.id}/edit`} style={{ flex: 1 }}>
                    <Button size="large" block>
                      Edit Ride
                    </Button>
                  </Link>
                )}
                <Link to={`/rides/${ride.id}/requests`} style={{ flex: 1 }}>
                  <Button size="large" block>
                    View Requests
                  </Button>
                </Link>
                {ride.status === "PUBLISHED" && (
                  <Button
                    size="large"
                    loading={actionLoading}
                    onClick={() => runAction(() => rideService.start(ride.id), "Ride started")}
                    style={{ flex: 1 }}
                  >
                    Start Ride
                  </Button>
                )}
                {ride.status === "STARTED" && (
                  <Button
                    size="large"
                    type="primary"
                    style={{
                      background: "linear-gradient(135deg, #2DD4BF, #8B5CF6)",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(45, 212, 191, 0.3)",
                      fontWeight: 700,
                      flex: 1,
                    }}
                    loading={actionLoading}
                    onClick={() => runAction(() => rideService.complete(ride.id), "Ride completed")}
                  >
                    Complete Ride
                  </Button>
                )}
                {["DRAFT", "PUBLISHED"].includes(ride.status) && (
                  <Popconfirm title="Cancel this ride?" onConfirm={() => runAction(() => rideService.cancel(ride.id), "Ride cancelled")}>
                    <Button size="large" danger style={{ flex: 1 }}>
                      Cancel Ride
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}

            {!isOwner && (
              <Button size="large" icon={<FlagOutlined />} onClick={() => setReportModalOpen(true)} style={{ flex: 1 }}>
                Report User
              </Button>
            )}
          </ActionButtons>

      {/* Request Modal */}
      <Modal
        title="Request to Join This Ride"
        open={requestModalOpen}
        onCancel={() => {
          setRequestModalOpen(false);
          requestForm.resetFields();
        }}
        onOk={handleRequestSubmit}
        confirmLoading={actionLoading}
        okText="Send Request"
        okButtonProps={{ style: { background: "linear-gradient(135deg, #2DD4BF, #8B5CF6)", border: "none" } }}
      >
        <Form form={requestForm} layout="vertical" initialValues={{ seatsRequested: 1 }}>
          <Form.Item label="Pickup Location" required>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Form.Item name="pickupName" noStyle>
                <Input
                  placeholder="Select pickup location"
                  readOnly
                  prefix={<EnvironmentOutlined />}
                  onClick={() => setPickupModalOpen(true)}
                  style={{ cursor: "pointer" }}
                />
              </Form.Item>
              <Form.Item name="pickupLatitude" noStyle hidden>
                <Input />
              </Form.Item>
              <Form.Item name="pickupLongitude" noStyle hidden>
                <Input />
              </Form.Item>
              <Button block onClick={() => setPickupModalOpen(true)}>
                Pick on Map
              </Button>
            </Space>
          </Form.Item>

          <Form.Item label="Drop Location" required>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Form.Item name="dropName" noStyle>
                <Input
                  placeholder="Select drop location"
                  readOnly
                  prefix={<EnvironmentOutlined />}
                  onClick={() => setDropModalOpen(true)}
                  style={{ cursor: "pointer" }}
                />
              </Form.Item>
              <Form.Item name="dropLatitude" noStyle hidden>
                <Input />
              </Form.Item>
              <Form.Item name="dropLongitude" noStyle hidden>
                <Input />
              </Form.Item>
              <Button block onClick={() => setDropModalOpen(true)}>
                Pick on Map
              </Button>
            </Space>
          </Form.Item>

          <Form.Item name="seatsRequested" label="Seats" rules={[{ required: true }]}>
            <InputNumber min={1} max={ride.availableSeats} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="message" label="Message to rider (optional)">
            <Input.TextArea maxLength={300} rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Report Modal */}
      <Modal
        title="Report User"
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        onOk={handleReportSubmit}
        confirmLoading={actionLoading}
        okText="Submit Report"
        okButtonProps={{ danger: true }}
      >
        <Form form={reportForm} layout="vertical">
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Please describe the reason" }]}>
            <Input.TextArea maxLength={150} rows={2} />
          </Form.Item>
          <Form.Item name="details" label="Additional details (optional)">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Location Picker Modals */}
      <LocationPickerModal
        open={pickupModalOpen}
        title="Select Pickup Location"
        onCancel={() => setPickupModalOpen(false)}
        onConfirm={handlePickupConfirm}
        initialPosition={
          requestForm.getFieldValue("pickupLatitude")
            ? { latitude: requestForm.getFieldValue("pickupLatitude"), longitude: requestForm.getFieldValue("pickupLongitude") }
            : null
        }
      />

      <LocationPickerModal
        open={dropModalOpen}
        title="Select Drop Location"
        onCancel={() => setDropModalOpen(false)}
        onConfirm={handleDropConfirm}
        initialPosition={
          requestForm.getFieldValue("dropLatitude")
            ? { latitude: requestForm.getFieldValue("dropLatitude"), longitude: requestForm.getFieldValue("dropLongitude") }
            : null
        }
      />

      <style>{`
        .dark-alert .ant-alert {
          background: rgba(45, 212, 191, 0.08) !important;
          border: 1px solid rgba(45, 212, 191, 0.25) !important;
        }
        .dark-alert .ant-alert-message {
          color: #E2F8F5 !important;
        }
        .dark-alert .ant-alert-description {
          color: ${dark.textSecondary} !important;
        }
      `}</style>
      </PageContainer>
    </Stage>
  );
}