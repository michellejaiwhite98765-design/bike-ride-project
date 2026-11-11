import { useEffect, useState } from "react";
import { List, Card, Avatar, Rate, Empty, Result, Button } from "antd";
import { Link } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../context/AuthContext.jsx";
import { userService } from "../services/userService.js";
import { useRiderStatus } from "../hooks/useRiderStatus.js";
import BrandLoader from "../components/ui/BrandLoader.jsx";

export default function RatingsPage() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { status: riderStatus } = useRiderStatus();
  const isDriver = Boolean(riderStatus?.isRider);

  useEffect(() => {
    if (!isDriver) return;
    // Only reviews passengers left on trips this user drove.
    userService
      .getRatings(user.id, { asDriver: true })
      .then(setRatings)
      .finally(() => setLoading(false));
  }, [user.id, isDriver]);

  if (riderStatus && !isDriver) {
    return (
      <Result
        icon={<UserOutlined />}
        title="Ratings are for drivers"
        subTitle="Passengers rate their driver after each trip. Add a vehicle to start offering rides and collecting ratings."
        extra={<Link to="/vehicles"><Button type="primary">Add a vehicle</Button></Link>}
      />
    );
  }
  if (!riderStatus || loading) return <BrandLoader label="Loading ratings…" />;

  const average = ratings.length ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1) : null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2>My Ratings {average && `(${average} / 5 from ${ratings.length})`}</h2>
      {ratings.length === 0 ? (
        <Empty description="No ratings yet" />
      ) : (
        <List
          dataSource={ratings}
          renderItem={(r) => (
            <List.Item>
              <Card style={{ width: "100%" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <Avatar style={{ background: "#0f766e" }} src={r.reviewer?.profileImage || undefined} icon={<UserOutlined />}>
                    {r.reviewer?.firstName?.[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>
                        {r.reviewer?.firstName} {r.reviewer?.lastName}
                      </strong>
                      <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{dayjs(r.createdAt).format("DD MMM YYYY")}</span>
                    </div>
                    <Rate disabled value={r.score} style={{ fontSize: 14 }} />
                    {r.comment && <p style={{ margin: "4px 0 0", color: "var(--text-tertiary)" }}>{r.comment}</p>}
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
