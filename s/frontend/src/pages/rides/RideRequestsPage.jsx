import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Avatar, Button, List, Empty, Skeleton, App, Space } from "antd";
import { UserOutlined, EnvironmentOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { rideService } from "../../services/rideService.js";
import StatusTag from "../../components/StatusTag.jsx";
import colors from "../../theme/colors.js";

const PageContainer = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${colors.primary};
    font-weight: 600;
    text-decoration: none;
    font-size: 13px;
    margin-bottom: 12px;
    transition: color 0.2s ease;

    &:hover {
      color: ${colors.primaryDark};
    }
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }

  .subtitle {
    color: ${colors.textSecondary};
    font-size: 13px;
    margin-top: 4px;
  }
`;

const RequestCard = styled(Card)`
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  transition: all 0.3s ease;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: ${colors.shadowMd};
  }
`;

const RequestHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .avatar {
    width: 48px;
    height: 48px;
    background: ${colors.primary};
    color: ${colors.textInverse};
    font-weight: 700;
  }

  .info {
    flex: 1;

    .name {
      font-weight: 600;
      color: ${colors.textPrimary};
      font-size: 14px;
    }

    .meta {
      color: ${colors.textSecondary};
      font-size: 12px;
      margin-top: 2px;
    }
  }

  .status {
    text-align: right;
  }
`;

const RequestDetails = styled.div`
  padding: 12px 0;
  border-top: 1px solid ${colors.border};
  border-bottom: 1px solid ${colors.border};
  margin-bottom: 12px;

  .detail-item {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    color: ${colors.textSecondary};

    &:last-child {
      margin-bottom: 0;
    }

    .icon {
      color: ${colors.primary};
      flex-shrink: 0;
    }
  }
`;

const RequestMessage = styled.div`
  padding: 12px;
  background: ${colors.bgSecondary};
  border-radius: 8px;
  border-left: 3px solid ${colors.primary};
  font-size: 12px;
  color: ${colors.textPrimary};
  margin-bottom: 12px;
  font-style: italic;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

export default function RideRequestsPage() {
  const { id } = useParams();
  const { message } = App.useApp();
  const [requests, setRequests] = useState([]);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [rideData, requestData] = await Promise.all([rideService.getById(id), rideService.listRequests(id)]);
      setRide(rideData);
      setRequests(requestData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function accept(requestId) {
    setActioningId(requestId);
    try {
      await rideService.acceptRequest(requestId);
      message.success("Request accepted");
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActioningId(null);
    }
  }

  async function reject(requestId) {
    setActioningId(requestId);
    try {
      await rideService.rejectRequest(requestId);
      message.success("Request rejected");
      load();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <Skeleton active />;

  return (
    <PageContainer>
      <Header>
        <Link to={`/rides/${id}`} className="back-link">
          <ArrowLeftOutlined /> Back to Ride
        </Link>
        <h1>
          Join Requests for {ride.sourceName} → {ride.destinationName}
        </h1>
        <p className="subtitle">
          {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} available
        </p>
      </Header>

      {requests.length === 0 ? (
        <Empty description="No requests yet" style={{ marginTop: 40 }} />
      ) : (
        <List
          dataSource={requests}
          renderItem={(req) => (
            <List.Item style={{ marginBottom: 0, padding: 0 }}>
              <RequestCard style={{ width: "100%", marginBottom: 12 }}>
                <RequestHeader>
                  <Avatar className="avatar" icon={<UserOutlined />}>
                    {req.passenger?.firstName?.[0]}
                  </Avatar>
                  <div className="info">
                    <div className="name">
                      {req.passenger?.firstName} {req.passenger?.lastName}
                    </div>
                    <div className="meta">
                      {req.seatsRequested} seat{req.seatsRequested !== 1 ? "s" : ""} requested
                    </div>
                  </div>
                  <div className="status">
                    <StatusTag status={req.status} />
                  </div>
                </RequestHeader>

                <RequestDetails>
                  <div className="detail-item">
                    <EnvironmentOutlined className="icon" />
                    <span>
                      Pickup: <strong>{req.pickupName}</strong>
                    </span>
                  </div>
                  <div className="detail-item">
                    <EnvironmentOutlined className="icon" />
                    <span>
                      Drop-off: <strong>{req.dropName}</strong>
                    </span>
                  </div>
                </RequestDetails>

                {req.message && <RequestMessage>&ldquo;{req.message}&rdquo;</RequestMessage>}

                {req.status === "REQUESTED" && (
                  <ActionButtons>
                    <Button
                      size="small"
                      type="primary"
                      style={{ background: colors.primary }}
                      icon={<CheckCircleOutlined />}
                      loading={actioningId === req.id}
                      onClick={() => accept(req.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      loading={actioningId === req.id}
                      onClick={() => reject(req.id)}
                    >
                      Reject
                    </Button>
                  </ActionButtons>
                )}
              </RequestCard>
            </List.Item>
          )}
        />
      )}
    </PageContainer>
  );
}
