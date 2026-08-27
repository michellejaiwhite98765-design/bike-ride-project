import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Statistic, Button, Skeleton, Empty } from "antd";
import {
  SearchOutlined,
  PlusCircleOutlined,
  CarOutlined,
  CalendarOutlined,
  StarFilled,
  DollarCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext.jsx";
import { rideService } from "../services/rideService.js";
import { bookingService } from "../services/bookingService.js";
import { userService } from "../services/userService.js";
import StatusTag from "../components/StatusTag.jsx";
import colors from "../theme/colors.js";

const WelcomeSection = styled.div`
  margin-bottom: 40px;
  padding: 32px;
  background: linear-gradient(135deg, ${colors.primary} 0%, #0d5d57 100%);
  border-radius: 12px;
  color: ${colors.textInverse};

  h1 {
    margin: 0 0 8px;
    font-size: 32px;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled(Button)`
  height: auto;
  padding: 16px !important;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  color: ${colors.textPrimary};
  transition: all 0.3s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.bgSecondary};
    transform: translateY(-2px);
  }

  svg {
    font-size: 18px;
    color: ${colors.primary};
  }
`;

const UpcomingCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  height: 100%;

  .route {
    font-size: 15px;
    font-weight: 600;
    color: ${colors.textPrimary};
    margin-bottom: 8px;
  }

  .details {
    color: ${colors.textSecondary};
    font-size: 12px;
    margin-bottom: 12px;
  }
`;

const StatCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  text-align: center;

  .ant-statistic-title {
    color: ${colors.textSecondary};
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .ant-statistic-content {
    color: ${colors.primary};
    font-size: 24px;
    font-weight: 700;
  }
`;

const QuickActionsSection = styled.div`
  margin-top: 40px;
`;

export default function DashboardPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [myRides, myBookings, profile] = await Promise.all([
          rideService.listMine(),
          bookingService.listMine(),
          userService.getPublicProfile(user.id),
        ]);
        if (cancelled) return;
        setRides(myRides);
        setBookings(myBookings);
        setRating(profile.rating);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (loading) return <Skeleton active />;

  const upcomingRide = rides.find((r) => r.status === "PUBLISHED" || r.status === "STARTED");
  const activeBooking = bookings.find((b) => ["PAYMENT_PENDING", "CONFIRMED"].includes(b.bookingStatus));
  const publishedCount = rides.filter((r) => r.status === "PUBLISHED").length;
  const completedCount = rides.filter((r) => r.status === "COMPLETED").length;
  const totalTips = rides
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + Number(r.tipAmount || 0), 0);

  return (
    <div>
      {loading ? (
        <Skeleton active />
      ) : (
        <>
          {/* Welcome Section */}
          <WelcomeSection>
            <h1>Welcome back, {user.firstName}! 👋</h1>
            <p>Here's what's happening with your BikeRide account</p>

            {/* Quick Action Buttons */}
            <ActionGrid>
              <Link to="/search" style={{ textDecoration: "none" }}>
                <ActionCard type="text" icon={<SearchOutlined />}>
                  Find a Ride
                </ActionCard>
              </Link>
              <Link to="/rides/create" style={{ textDecoration: "none" }}>
                <ActionCard type="text" icon={<PlusCircleOutlined />}>
                  Create a Ride
                </ActionCard>
              </Link>
              <Link to="/rides" style={{ textDecoration: "none" }}>
                <ActionCard type="text" icon={<CarOutlined />}>
                  My Rides
                </ActionCard>
              </Link>
              <Link to="/bookings" style={{ textDecoration: "none" }}>
                <ActionCard type="text" icon={<CalendarOutlined />}>
                  My Bookings
                </ActionCard>
              </Link>
            </ActionGrid>
          </WelcomeSection>

          {/* Upcoming Ride & Active Booking */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <UpcomingCard title="Your Next Ride">
                {upcomingRide ? (
                  <div>
                    <div className="route">
                      {upcomingRide.sourceName} <ArrowRightOutlined style={{ fontSize: 12, margin: "0 4px" }} /> {upcomingRide.destinationName}
                    </div>
                    <div className="details">
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      {dayjs(upcomingRide.departureDate).format("DD MMM YYYY")} at {upcomingRide.departureTime}
                    </div>
                    <StatusTag status={upcomingRide.status} />
                    <div style={{ marginTop: 16 }}>
                      <Link to={`/rides/${upcomingRide.id}`} style={{ textDecoration: "none" }}>
                        <Button type="primary" size="small" style={{ background: colors.primary }}>
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Empty description="No upcoming rides" style={{ margin: "20px 0" }} />
                )}
              </UpcomingCard>
            </Col>

            <Col xs={24} md={12}>
              <UpcomingCard title="Active Booking">
                {activeBooking ? (
                  <div>
                    <div className="route">
                      {activeBooking.ride.sourceName} <ArrowRightOutlined style={{ fontSize: 12, margin: "0 4px" }} /> {activeBooking.ride.destinationName}
                    </div>
                    <div className="details">
                      <CarOutlined style={{ marginRight: 4 }} />
                      {activeBooking.ride.vehicle?.brand} {activeBooking.ride.vehicle?.model}
                    </div>
                    <StatusTag status={activeBooking.bookingStatus} />
                    <div style={{ marginTop: 16 }}>
                      <Link to={`/bookings/${activeBooking.id}`} style={{ textDecoration: "none" }}>
                        <Button type="primary" size="small" style={{ background: colors.primary }}>
                          View Booking
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Empty description="No active bookings" style={{ margin: "20px 0" }} />
                )}
              </UpcomingCard>
            </Col>
          </Row>

          {/* Statistics */}
          <QuickActionsSection>
            <h3 style={{ marginBottom: 16, color: colors.textPrimary, fontSize: 16, fontWeight: 600 }}>Your Statistics</h3>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <StatCard>
                  <Statistic
                    title="Published Rides"
                    value={publishedCount}
                    prefix={<CarOutlined />}
                  />
                </StatCard>
              </Col>
              <Col xs={12} sm={6}>
                <StatCard>
                  <Statistic
                    title="Completed Rides"
                    value={completedCount}
                    prefix={<CalendarOutlined />}
                  />
                </StatCard>
              </Col>
              <Col xs={12} sm={6}>
                <StatCard>
                  <Statistic
                    title="Total Tips"
                    value={totalTips}
                    prefix={<DollarCircleOutlined />}
                    precision={0}
                    suffix="₹"
                  />
                </StatCard>
              </Col>
              <Col xs={12} sm={6}>
                <StatCard>
                  <Statistic
                    title="Your Rating"
                    value={rating ?? "—"}
                    prefix={<StarFilled style={{ color: "#faad14" }} />}
                    suffix={rating ? "/ 5" : ""}
                  />
                </StatCard>
              </Col>
            </Row>
          </QuickActionsSection>
        </>
      )}
    </div>
  );
}
