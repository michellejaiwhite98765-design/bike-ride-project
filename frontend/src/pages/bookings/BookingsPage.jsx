import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { List, Card, Empty, Skeleton } from "antd";
import { ArrowRightOutlined, CalendarOutlined, DollarCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { bookingService } from "../../services/bookingService.js";
import StatusTag from "../../components/StatusTag.jsx";
import colors from "../../theme/colors.js";

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

const BookingCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  transition: all 0.3s ease;
  height: 100%;
  cursor: pointer;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: ${colors.shadowMd};
    transform: translateY(-2px);
  }
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  .route {
    font-size: 15px;
    font-weight: 600;
    color: ${colors.textPrimary};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-price {
    text-align: right;
  }

  .price {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.primary};
    margin-top: 8px;
  }
`;

const BookingDetails = styled.div`
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid ${colors.border};
  font-size: 12px;
  color: ${colors.textSecondary};

  .detail {
    display: flex;
    align-items: center;
    gap: 6px;

    .icon {
      color: ${colors.primary};
    }
  }
`;

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingService
      .listMine()
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active />;

  return (
    <div>
      <PageHeader>
        <h1>My Bookings</h1>
        <p>View and manage all your ride bookings</p>
      </PageHeader>

      {bookings.length === 0 ? (
        <Empty description="You haven't booked any rides yet" style={{ marginTop: 40 }} />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
          dataSource={bookings}
          renderItem={(b) => (
            <List.Item>
              <Link to={`/bookings/${b.id}`} style={{ width: "100%", textDecoration: "none" }}>
                <BookingCard>
                  <BookingHeader>
                    <div className="route">
                      <span>{b.ride.sourceName}</span>
                      <ArrowRightOutlined style={{ fontSize: 12 }} />
                      <span>{b.ride.destinationName}</span>
                    </div>
                    <div className="status-price">
                      <StatusTag status={b.bookingStatus} />
                      <div className="price">₹{b.totalAmount}</div>
                    </div>
                  </BookingHeader>

                  <BookingDetails>
                    <div className="detail">
                      <CalendarOutlined className="icon" />
                      <span>{dayjs(b.ride.departureDate).format("DD MMM YYYY")} at {b.ride.departureTime}</span>
                    </div>
                    <div className="detail">
                      <DollarCircleOutlined className="icon" />
                      <span>{b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""}</span>
                    </div>
                  </BookingDetails>
                </BookingCard>
              </Link>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
