import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BulbOutlined,
  CarOutlined,
  GlobalOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LogoutOutlined,
  RightOutlined,
  SafetyOutlined,
  SettingOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { disconnectSocket } from "../../services/socket.js";
import { LanguageSheet } from "../LanguagePicker.jsx";
import { LANGUAGES } from "../../i18n/languages.js";

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
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  async function handleLogout() {
    await logout();
    disconnectSocket();
    navigate("/");
  }

  const links = [
    { to: "/vehicles", icon: <CarOutlined />, label: t("menu.vehicles") },
    { to: "/profile/licence", icon: <IdcardOutlined />, label: t("menu.licence") },
    { to: "/history", icon: <HistoryOutlined />, label: t("menu.history") },
    { to: "/ratings", icon: <StarOutlined />, label: t("menu.ratings") },
    { to: "/safety", icon: <SafetyOutlined />, label: t("menu.safety") },
    ...(user?.role === "ADMIN" ? [{ to: "/admin", icon: <SettingOutlined />, label: t("menu.admin") }] : []),
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
      <button type="button" className="am-item" onClick={() => setLangOpen(true)}>
        <span className="am-icon"><GlobalOutlined /></span>
        <span className="am-label">{t("menu.language")}</span>
        <span className="am-value">{current.native}</span>
        <RightOutlined className="am-arrow" />
      </button>
      <button type="button" className="am-item" onClick={toggleTheme}>
        <span className="am-icon"><BulbOutlined /></span>
        <span className="am-label">{mode === "dark" ? t("menu.lightMode") : t("menu.darkMode")}</span>
      </button>
      <button type="button" className="am-item am-logout" onClick={handleLogout}>
        <span className="am-icon"><LogoutOutlined /></span>
        <span className="am-label">{t("menu.logout")}</span>
      </button>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
      <style>{`
        .am-list{margin:16px 0 24px;border-radius:16px;overflow:hidden;border:1px solid var(--chrome-border);background:var(--bg-secondary)}
        .am-item{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--divider);background:transparent;color:var(--text-primary)!important;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;text-align:start}
        .am-item:last-child{border-bottom:0}
        .am-item:active{background:var(--chrome-tint)}
        .am-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--chrome-tint);color:#2DD4BF;font-size:16px;flex:0 0 32px}
        .am-label{flex:1}
        .am-value{color:var(--text-secondary);font-size:13px;font-weight:600}
        .am-arrow{color:var(--text-secondary);font-size:12px}
        .am-logout{color:#ef4444!important}
        .am-logout .am-icon{color:#ef4444;background:rgba(239,68,68,.12)}
      `}</style>
    </nav>
  );
}
