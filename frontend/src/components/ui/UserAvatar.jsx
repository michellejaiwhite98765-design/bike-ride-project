import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

/** A person's round avatar: their profile photo, else their first initial. */
export default function UserAvatar({ user, size = 40, className, style }) {
  const initial = user?.firstName?.[0]?.toUpperCase();
  return (
    <Avatar
      size={size}
      src={user?.profileImage || undefined}
      icon={!user?.profileImage && !initial ? <UserOutlined /> : undefined}
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {initial}
    </Avatar>
  );
}
