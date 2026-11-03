import { Link, useNavigate } from "react-router-dom";
import {
  BulbOutlined,
  CarOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LogoutOutlined,
  RightOutlined,
  SafetyOutlined,
  SettingOutlined,
  StarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { disconnectSocket } from "../../services/socket.js";

/**
 * Account links on the Profile page. On phones the header has no avatar menu
 * or side menu (the bottom bar covers Home/Search/Rides/Alerts/Profile), so
 * everything else that lived there - bookings, vehicles, history, safety,
 * theme, logout - is reachable from here.
 */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    disconnectSocket();
    navigate("/");
  }

  const links = [
    { to: "/profile/edit", icon: <UserOutlined />, label: "Personal information" },
    { to: "/bookings", icon: <FileTextOutlined />, label: "My Bookings" },
    { to: "/vehicles", icon: <CarOutlined />, label: "My Vehicles" },
    { to: "/history", icon: <HistoryOutlined />, label: "Ride History" },
    { to: "/ratings", icon: <StarOutlined />, label: "Ratings" },
    { to: "/safety", icon: <SafetyOutlined />, label: "Safety" },
    ...(user?.role === "ADMIN" ? [{ to: "/admin", icon: <SettingOutlined />, label: "Admin" }] : []),
  ];

  return (
    <nav className="am-list" aria-label="Account">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="am-item">
          <span className="am-icon">{l.icon}</span>
          <span className="am-label">{l.label}</span>
          <RightOutlined className="am-arrow" />
        </Link>
      ))}
      <button type="button" className="am-item" onClick={toggleTheme}>
        <span className="am-icon"><BulbOutlined /></span>
        <span className="am-label">{mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
      </button>
      <button type="button" className="am-item am-logout" onClick={handleLogout}>
        <span className="am-icon"><LogoutOutlined /></span>
        <span className="am-label">Logout</span>
      </button>
      <style>{`
        .am-list{margin:16px 0 24px;border-radius:16px;overflow:hidden;border:1px solid var(--chrome-border);background:var(--bg-secondary)}
        .am-item{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--divider);background:transparent;color:var(--text-primary)!important;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;text-align:left}
        .am-item:last-child{border-bottom:0}
        .am-item:active{background:var(--chrome-tint)}
        .am-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--chrome-tint);color:#2DD4BF;font-size:16px;flex:0 0 32px}
        .am-label{flex:1}
        .am-arrow{color:var(--text-secondary);font-size:12px}
        .am-logout{color:#ef4444!important}
        .am-logout .am-icon{color:#ef4444;background:rgba(239,68,68,.12)}
      `}</style>
    </nav>
  );
}
