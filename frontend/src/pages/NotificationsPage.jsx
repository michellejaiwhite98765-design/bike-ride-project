import { useEffect, useMemo, useState } from "react";
import {
  BellOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CarOutlined,
  FlagFilled,
  DollarCircleFilled,
  StarFilled,
  SafetyCertificateFilled,
  UserAddOutlined,
  StopFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import styled from "styled-components";
import { notificationService } from "../services/notificationService.js";
import colors from "../theme/colors.js";
import BrandLoader from "../components/ui/BrandLoader.jsx";

dayjs.extend(relativeTime);

// One icon + accent colour per notification type, so a glance at the list
// tells you what kind of update each row is.
const TYPE_META = {
  RIDE_REQUEST_CREATED: { icon: <UserAddOutlined />, color: "#3b82f6" },
  RIDE_REQUEST_ACCEPTED: { icon: <CheckCircleFilled />, color: "#22c55e" },
  RIDE_REQUEST_REJECTED: { icon: <CloseCircleFilled />, color: "#ef4444" },
  PAYMENT_REQUIRED: { icon: <DollarCircleFilled />, color: "#f59e0b" },
  PAYMENT_SUCCESS: { icon: <DollarCircleFilled />, color: "#22c55e" },
  RIDE_STARTED: { icon: <CarOutlined />, color: "#2DD4BF" },
  RIDE_COMPLETED: { icon: <FlagFilled />, color: "#8b5cf6" },
  RIDE_CANCELLED: { icon: <StopFilled />, color: "#ef4444" },
  NEW_RATING: { icon: <StarFilled />, color: "#eab308" },
  SAFETY_REPORT_UPDATED: { icon: <SafetyCertificateFilled />, color: "#f97316" },
};
const DEFAULT_META = { icon: <BellOutlined />, color: "#2DD4BF" };

function groupLabel(date) {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, "day")) return "Today";
  if (now.diff(d, "day") < 7) return "This week";
  if (now.diff(d, "day") < 30) return "This month";
  return "Earlier";
}

const PageContainer = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 8px 0 40px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 0 16px;
  margin-bottom: 8px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: ${colors.textPrimary};
  }
`;

const MarkAllLink = styled.button`
  border: 0;
  background: none;
  cursor: pointer;
  padding: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #3b9cff;

  &:hover {
    color: ${colors.textPrimary};
  }
`;

const GroupLabel = styled.div`
  padding: 18px 16px 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${colors.textPrimary};
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  cursor: ${(p) => (p.$unread ? "pointer" : "default")};
  transition: background 0.15s ease;

  &:hover {
    background: ${colors.bgSecondary};
  }

  /* avatar-style circle, with a gradient "story" ring while unread */
  .avatar {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    padding: 2px;
    background: ${(p) =>
      p.$unread ? `linear-gradient(45deg, ${p.$color}, #f43f8e)` : "transparent"};
  }

  .avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: ${(p) => p.$color};
    background: color-mix(in srgb, ${(p) => p.$color} 16%, ${colors.bgPrimary});
    border: 2px solid ${colors.bgPrimary};
  }

  .text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    line-height: 1.4;
    color: ${colors.textPrimary};
    word-break: break-word;
  }

  .title {
    font-weight: 700;
  }

  .message {
    color: ${(p) => (p.$unread ? colors.textPrimary : colors.textSecondary)};
  }

  .time {
    margin-left: 6px;
    white-space: nowrap;
    color: ${colors.textTertiary};
  }

  .dot {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #3b9cff;
  }
`;

const EmptyState = styled.div`
  margin-top: 48px;
  text-align: center;
  color: ${colors.textSecondary};

  .ring {
    width: 96px;
    height: 96px;
    margin: 0 auto 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    color: ${colors.primary};
    background: color-mix(in srgb, ${colors.primary} 12%, transparent);
    border: 1px dashed color-mix(in srgb, ${colors.primary} 50%, transparent);
  }

  h3 {
    margin: 0 0 6px;
    font-size: 18px;
    color: ${colors.textPrimary};
  }

  p {
    margin: 0;
    font-size: 13.5px;
  }
`;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
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
    // Optimistic: flip the row immediately instead of flashing the skeleton.
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await notificationService.markRead(id);
    load({ silent: true });
  }

  async function markAllRead() {
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllRead();
    load({ silent: true });
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const groups = useMemo(() => {
    const order = ["Today", "This week", "This month", "Earlier"];
    const map = new Map(order.map((label) => [label, []]));
    notifications.forEach((n) => map.get(groupLabel(n.createdAt)).push(n));
    return order.filter((label) => map.get(label).length).map((label) => ({ label, items: map.get(label) }));
  }, [notifications]);

  if (loading) return <BrandLoader label="Loading notifications…" />;

  return (
    <PageContainer>
      <PageHeader>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <MarkAllLink type="button" onClick={markAllRead}>
            Mark all as read
          </MarkAllLink>
        )}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState>
          <div className="ring">
            <BellOutlined />
          </div>
          <h3>No notifications yet</h3>
          <p>Ride requests, payments and trip updates will show up here.</p>
        </EmptyState>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <GroupLabel>{group.label}</GroupLabel>
            {group.items.map((n) => {
              const meta = TYPE_META[n.type] || DEFAULT_META;
              const unread = !n.isRead;
              return (
                <Item key={n.id} $unread={unread} $color={meta.color} onClick={() => unread && markRead(n.id)}>
                  <div className="avatar">
                    <div className="avatar-inner">{meta.icon}</div>
                  </div>
                  <div className="text">
                    <span className="title">{n.title}</span> <span className="message">{n.message}</span>
                    <span className="time" title={dayjs(n.createdAt).format("DD MMM YYYY, HH:mm")}>
                      {dayjs(n.createdAt).fromNow(true)}
                    </span>
                  </div>
                  {unread && <span className="dot" />}
                </Item>
              );
            })}
          </section>
        ))
      )}
    </PageContainer>
  );
}
