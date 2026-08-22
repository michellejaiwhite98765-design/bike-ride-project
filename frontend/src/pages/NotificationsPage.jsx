import { useEffect, useState } from "react";
import { List, Card, Button, Empty, Skeleton, Badge } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { notificationService } from "../services/notificationService.js";
import colors from "../theme/colors.js";

const PageContainer = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }
`;

const NotificationCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgPrimary};
  transition: all 0.3s ease;
  margin-bottom: 12px;
  cursor: ${(p) => (p.$isRead ? "default" : "pointer")};
  opacity: ${(p) => (p.$isRead ? 0.7 : 1)};

  &:hover {
    border-color: ${(p) => (p.$isRead ? colors.border : colors.primary)};
    box-shadow: ${(p) => (p.$isRead ? "none" : colors.shadowMd)};
  }
`;

const NotificationContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;

  .badge {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .content {
    flex: 1;

    .title {
      font-weight: 600;
      color: ${colors.textPrimary};
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message {
      color: ${colors.textSecondary};
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 8px;
    }
  }

  .timestamp {
    color: ${colors.textTertiary};
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  button {
    font-size: 13px;
  }
`;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setNotifications(await notificationService.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    await notificationService.markRead(id);
    load();
  }

  async function markAllRead() {
    await notificationService.markAllRead();
    load();
  }

  if (loading) return <Skeleton active />;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <PageContainer>
      <PageHeader>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <Button
            icon={<CheckOutlined />}
            onClick={markAllRead}
            style={{ background: colors.bgSecondary, border: `1px solid ${colors.border}` }}
          >
            Mark all as read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <Empty
          description="No notifications yet"
          style={{ marginTop: 40 }}
          image={<BellOutlined style={{ fontSize: 48, color: colors.textTertiary }} />}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item style={{ padding: 0, marginBottom: 0 }}>
              <NotificationCard
                $isRead={n.isRead}
                onClick={() => !n.isRead && markRead(n.id)}
                style={{ width: "100%" }}
              >
                <NotificationContent>
                  <div className="badge">
                    {!n.isRead && (
                      <Badge
                        status="processing"
                        color={colors.primary}
                      />
                    )}
                  </div>
                  <div className="content">
                    <div className="title">
                      {n.title}
                    </div>
                    <div className="message">
                      {n.message}
                    </div>
                  </div>
                  <div className="timestamp">
                    {dayjs(n.createdAt).format("DD MMM, HH:mm")}
                  </div>
                </NotificationContent>
              </NotificationCard>
            </List.Item>
          )}
        />
      )}
    </PageContainer>
  );
}
