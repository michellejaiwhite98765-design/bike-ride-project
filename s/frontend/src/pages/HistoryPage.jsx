import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, List, Card, Empty, Skeleton } from "antd";
import { ArrowRightOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { rideService } from "../services/rideService.js";
import { bookingService } from "../services/bookingService.js";
import StatusTag from "../components/StatusTag.jsx";
import colors from "../theme/colors.js";

const PageHeader = styled.div`
  margin-bottom: 32px;

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }

  p {
    margin: 8px 0 0;
    color: ${colors.textSecondary};
    font-size: 13px;
  }
`;

const HistoryCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  transition: all 0.3s ease;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: ${colors.shadowMd};
    transform: translateY(-2px);
  }
`;

const HistoryContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .route {
    flex: 1;

    .title {
      font-weight: 600;
      color: ${colors.textPrimary};
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .date {
      color: ${colors.textSecondary};
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .status {
    text-align: right;

    @media (max-width: 600px) {
      text-align: left;
    }
  }
`;

const StyledTabs = styled(Tabs)`
  .ant-tabs-tab {
    border-radius: 8px;
    margin-right: 8px;

    &[aria-selected="true"] {
      background: ${colors.bgSecondary};
    }
  }
`;

export default function HistoryPage() {
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([rideService.listMine(), bookingService.listMine()])
      .then(([r, b]) => {
        setRides(r.filter((x) => ["COMPLETED", "CANCELLED"].includes(x.status)));
        setBookings(b.filter((x) => ["CONFIRMED", "CANCELLED"].includes(x.bookingStatus) && ["COMPLETED", "CANCELLED"].includes(x.ride.status)));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active />;

  return (
    <div>
      <PageHeader>
        <h1>Ride History</h1>
        <p>View all your completed and cancelled rides</p>
      </PageHeader>

      <StyledTabs
        items={[
          {
            key: "rides",
            label: "As Rider",
            children:
              rides.length === 0 ? (
                <Empty description="No past rides as a rider" style={{ marginTop: 40 }} />
              ) : (
                <List
                  grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
                  dataSource={rides}
                  renderItem={(r) => (
                    <List.Item>
                      <Link to={`/rides/${r.id}`} style={{ width: "100%", textDecoration: "none" }}>
                        <HistoryCard>
                          <HistoryContent>
                            <div className="route">
                              <div className="title">
                                <span>{r.sourceName}</span>
                                <ArrowRightOutlined style={{ fontSize: 12 }} />
                                <span>{r.destinationName}</span>
                              </div>
                              <div className="date">
                                <CalendarOutlined />
                                {dayjs(r.departureDate).format("DD MMM YYYY")}
                              </div>
                            </div>
                            <div className="status">
                              <StatusTag status={r.status} />
                            </div>
                          </HistoryContent>
                        </HistoryCard>
                      </Link>
                    </List.Item>
                  )}
                />
              ),
          },
          {
            key: "bookings",
            label: "As Passenger",
            children:
              bookings.length === 0 ? (
                <Empty description="No past bookings as a passenger" style={{ marginTop: 40 }} />
              ) : (
                <List
                  grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
                  dataSource={bookings}
                  renderItem={(b) => (
                    <List.Item>
                      <Link to={`/bookings/${b.id}`} style={{ width: "100%", textDecoration: "none" }}>
                        <HistoryCard>
                          <HistoryContent>
                            <div className="route">
                              <div className="title">
                                <span>{b.ride.sourceName}</span>
                                <ArrowRightOutlined style={{ fontSize: 12 }} />
                                <span>{b.ride.destinationName}</span>
                              </div>
                              <div className="date">
                                <CalendarOutlined />
                                {dayjs(b.ride.departureDate).format("DD MMM YYYY")}
                              </div>
                            </div>
                            <div className="status">
                              <StatusTag status={b.bookingStatus} />
                            </div>
                          </HistoryContent>
                        </HistoryCard>
                      </Link>
                    </List.Item>
                  )}
                />
              ),
          },
        ]}
      />
    </div>
  );
}
