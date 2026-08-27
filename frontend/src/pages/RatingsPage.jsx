import { useEffect, useState } from "react";
import { List, Card, Avatar, Rate, Empty, Skeleton } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../context/AuthContext.jsx";
import { userService } from "../services/userService.js";

export default function RatingsPage() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService
      .getRatings(user.id)
      .then(setRatings)
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <Skeleton active />;

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
                  <Avatar style={{ background: "#0f766e" }} icon={<UserOutlined />}>
                    {r.reviewer?.firstName?.[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>
                        {r.reviewer?.firstName} {r.reviewer?.lastName}
                      </strong>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>{dayjs(r.createdAt).format("DD MMM YYYY")}</span>
                    </div>
                    <Rate disabled value={r.score} style={{ fontSize: 14 }} />
                    {r.comment && <p style={{ margin: "4px 0 0", color: "#64748b" }}>{r.comment}</p>}
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
