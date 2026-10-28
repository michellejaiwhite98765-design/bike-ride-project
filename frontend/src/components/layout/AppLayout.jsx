import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Dropdown, Drawer, Button, Badge as AntBadge, App as AntdApp } from "antd";
import { css } from "styled-components";
import {
  HomeOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  CarOutlined,
  BellOutlined,
  UserOutlined,
  MenuOutlined,
  LogoutOutlined,
  SettingOutlined,
  FileTextOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { locationService } from "../../services/locationService.js";
import { notificationService } from "../../services/notificationService.js";
import { connectSocket, disconnectSocket } from "../../services/socket.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import LiftshareMark from "../ui/LiftshareMark.jsx";
import colors from "../../theme/colors.js";

const { Header, Content, Footer } = Layout;

const ACCENT = "#2DD4BF";
const ACCENT_DARK = "#14B8A6";
const ACCENT_SOFT = "rgba(45, 212, 191, 0.14)";


const HeaderOuter = styled(Header)`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${colors.bgSecondary};
  padding: ${(p) => (p.$scrolled ? "10px 16px" : "16px 16px 18px")};
  height: auto;
  line-height: normal;
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  ${(p) =>
    p.$floating &&
    css`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: transparent;
      padding: 10px 16px;
    `}
`;

const Capsule = styled.div`
  max-width: 1350px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 28px;
  background: ${colors.bgPrimary};
  border: 1px solid ${colors.border};
  border-radius: 999px;
  padding: ${(p) => (p.$scrolled ? "8px 10px 8px 20px" : "12px 12px 12px 24px")};
  box-shadow: ${(p) => (p.$scrolled ? colors.shadowMd : "none")};
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
  @media (max-width: 1024px) {
    gap: 12px;
    padding: ${(p) => (p.$scrolled ? "8px 10px 8px 16px" : "10px 12px 10px 18px")};
  }

  @media (max-width: 480px) {
    padding: 6px 8px 6px 14px;
  }
`;

const BrandMark = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${ACCENT};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const BrandContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.textPrimary};
  white-space: nowrap;
  text-decoration: none;

  svg.brand-logo {
    display: block;
    flex-shrink: 0;
  }

  span.wordmark {
    font-size: 21px;
  }

  @media (max-width: 480px) {
    span.wordmark {
      font-size: 18px;
    }
  }

  @media (max-width: 380px) {
    span.wordmark {
      font-size: 16px;
    }
  }
`;

const DesktopNav = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const NavItems = styled.div`
  display: flex;
  align-items: center;
  gap: 22px;

  a {
    color: ${colors.textSecondary};
    text-decoration: none;
    font-weight: 500;
    font-size: 13.5px;
    transition: color 0.2s ease;
    white-space: nowrap;

    &:hover {
      color: ${ACCENT};
    }

    &.active {
      color: ${colors.textPrimary};
      font-weight: 700;
    }
  }
`;

const CtaLink = styled(Link)`
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  background: ${ACCENT};
  color: #fff !important;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: background 0.2s ease;

  &:hover {
    background: ${ACCENT_DARK};
    color: #fff;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  margin-left: auto; /* actions sit at the right edge; the logo stays on the left */

  @media (max-width: 768px) {
    gap: 8px;
  }

  @media (max-width: 480px) {
    gap: 6px;

    .guest-actions .ant-btn {
      height: 34px;
      padding: 0 14px;
      font-size: 13px;
    }
  }

  @media (max-width: 380px) {
    gap: 4px;

    .guest-actions .ant-btn {
      padding: 0 10px;
      font-size: 12.5px;
    }
    .ant-btn-icon-only {
      width: 32px;
    }
  }
`;

const NotificationIcon = styled.div`
  cursor: pointer;
  font-size: 18px;
  margin-right: 8px; /* room for the unread badge so it doesn't sit on the avatar */
  color: ${colors.textSecondary};
  transition: color 0.2s ease;
  display: flex;
  align-items: center;

  &:hover {
    color: ${ACCENT};
  }
`;

const AvatarButton = styled(Button)`
  &.ant-btn {
    background: ${ACCENT_SOFT};
    color: ${ACCENT};
    border: none;
  }
  &.ant-btn:hover {
    background: rgba(45, 212, 191, 0.24) !important;
    color: ${ACCENT_DARK} !important;
  }
`;

const ThemeToggleButton = styled.button`
  cursor: pointer;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid ${colors.border};
  background: transparent;
  color: ${colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: ${ACCENT};
    border-color: ${ACCENT};
  }
`;

const MobileBar = styled.div`
  display: none;
  align-items: center;

  @media (max-width: 1024px) {
    display: flex;
  }
`;

const BottomNav = styled.nav`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: ${colors.bgPrimary};
    border-top: 1px solid ${colors.border};
    z-index: 100;
    padding: 8px 0 12px;
  }
`;

const BottomNavItem = styled(Link)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: ${(p) => (p.$active ? ACCENT : colors.textTertiary)};
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  svg {
    font-size: 20px;
  }

  /* The badge wrapper is inline-block, which pushed the "Alerts" label lower
     than the other tabs - make it behave like the plain icons. */
  .ant-badge {
    display: flex;
    line-height: 1;
  }
`;

const ContentWrap = styled(Content)`
  padding: 8px 16px 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  /* Fill whatever the header and footer leave (the Layout is a flex column
     with min-height 100vh). A hard-coded calc() guess at their heights was
     off by ~27px, so even near-empty pages could be scrolled a little - and
     that tiny scroll range made the header flip size back and forth. */
  flex: 1 0 auto;
  background: ${colors.bgSecondary};

  @media (max-width: 768px) {
    padding: 8px 16px 96px;
  }

  ${(p) =>
    p.$fullBleed &&
    css`
      padding: 0;
      max-width: none;
      min-height: 0;
      flex: 0 0 auto; /* fixed height below - don't let the flex fill stretch it under the bottom tab bar */
      height: 100vh;
      overflow: hidden;

      @media (max-width: 768px) {
        padding: 0;
        height: calc(100vh - 70px);
      }
    `}
`;

const FooterBar = styled(Footer)`
  background: ${colors.bgPrimary};
  border-top: 1px solid ${colors.border};
  text-align: center;
  color: ${colors.textSecondary};
  padding: 24px 16px;
  font-size: 13px;
`;

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notification } = AntdApp.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Shrinking the header makes the page ~14px shorter. With a single
    // threshold that feeds back on short pages: shrink -> max scroll drops
    // below the threshold -> header grows -> page grows -> shrink again, which
    // is the visible "shaking". Two thresholds (a dead band wider than the
    // size change) break the loop.
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((prev) => (y > 48 ? true : y < 6 ? false : prev));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !window.localStorage.getItem("location_permission_requested")) {
      requestLocationPermission();
    }
  }, [isAuthenticated]);

  // Keep the bell badge in sync with real unread notifications: an initial
  // fetch (also re-run whenever the route changes, which cheaply covers the
  // "just read some on /notifications" case without needing shared state
  // between that page and this layout), plus a live bump when a notification
  // arrives over the socket while the app is open.
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    notificationService
      .list()
      .then((data) => {
        if (!cancelled) setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.isRead).length : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const socket = connectSocket();

    const onNotification = (incoming) => {
      setUnreadCount((count) => count + 1);
      // OTP notifications carry the code in their message, so show the whole
      // thing and keep it on screen long enough to read.
      const isOtp = ["PICKUP_OTP", "DROP_OTP"].includes(incoming?.type);
      notification.info({
        title: incoming?.title || "New notification",
        description: incoming?.message || "You have a new notification",
        duration: isOtp ? 15 : 4,
      });
    };
    socket.on("notification:new", onNotification);

    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [isAuthenticated, notification]);

  async function requestLocationPermission() {
    try {
      await locationService.requestPermission();
      window.localStorage.setItem("location_permission_requested", "true");
    } catch (err) {
      window.localStorage.setItem("location_permission_requested", "true");
    }
  }

  async function handleLogout() {
    await logout();
    disconnectSocket();
    navigate("/");
  }

  const isActive = (path) => (location.pathname === path ? "active" : "");
  const isHome = location.pathname === "/";
  const isSearchPage = location.pathname === "/search";
  const isEditRide = /^\/rides\/[^/]+\/edit$/.test(location.pathname);
  const isCreateRidePage = location.pathname === "/rides/create" || isEditRide;
  const isFullBleedPage = isHome || isSearchPage || isCreateRidePage;
  // Create/Find ride keep the normal header but in its compact size (and without
  // the link to the page you are already on) so the map gets the room.
  const compactHeader = isCreateRidePage || isSearchPage;
  const { mode, toggleTheme } = useTheme();

  const userMenu = {
    items: [
      { key: "profile", label: <Link to="/profile">Profile</Link> },
      { key: "vehicles", label: <Link to="/vehicles">My Vehicles</Link> },
      { key: "history", label: <Link to="/history">Ride History</Link> },
      { key: "safety", label: <Link to="/safety">Safety</Link> },
      ...(user?.role === "ADMIN" ? [{ key: "admin", label: <Link to="/admin">Admin</Link> }] : []),
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: "Settings",
        children: [
          {
            key: "theme",
            icon: mode === "dark" ? <SunOutlined /> : <MoonOutlined />,
            label: mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
            onClick: toggleTheme,
          },
        ],
      },
      { type: "divider" },
      { key: "logout", label: "Logout", onClick: handleLogout, icon: <LogoutOutlined /> },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderOuter $scrolled={scrolled || compactHeader} $floating={isFullBleedPage}>
        <Capsule $scrolled={scrolled || compactHeader}>
          <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="default"
                style={{ display: "flex", alignItems: "center", width: "100%", gap: 28 }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Link to="/" style={{ textDecoration: "none" }}>
                  <BrandContainer>
                    <LiftshareMark className="brand-logo" size={36} />
                    <span className="wordmark">Liftshare</span>
                  </BrandContainer>
                </Link>

                {isAuthenticated && (
                  <DesktopNav>
                    <NavItems>
                      {!isSearchPage && (
                        <Link to="/search" className={isActive("/search")}>
                          Find ride
                        </Link>
                      )}
                      <Link to="/rides" className={isActive("/rides")}>
                        My rides
                      </Link>
                    </NavItems>
                    {!isCreateRidePage && (
                      <CtaLink to="/rides/create">
                        <PlusCircleOutlined /> Create ride
                      </CtaLink>
                    )}
                  </DesktopNav>
                )}

                <UserSection>
                  {/* Signed-in users get the theme switch under Settings in the avatar menu. */}
                  {!isAuthenticated && (
                    <ThemeToggleButton type="button" onClick={toggleTheme} aria-label="Toggle light/dark mode">
                      {mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
                    </ThemeToggleButton>
                  )}

                  {isAuthenticated && (
                    <>
                      <Link to="/notifications">
                        <NotificationIcon>
                          <AntBadge count={unreadCount} color={ACCENT}>
                            <BellOutlined />
                          </AntBadge>
                        </NotificationIcon>
                      </Link>
                      <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
                        <AvatarButton shape="circle" size="large" icon={<UserOutlined />} />
                      </Dropdown>
                    </>
                  )}

                  {!isAuthenticated && (
                    <>
                      <Link to="/login" className="guest-actions">
                        <Button type="default" size="middle" style={{ borderRadius: 999 }}>
                          Login
                        </Button>
                      </Link>
                      <Link to="/register" className="guest-actions">
                        <Button type="primary" size="middle" style={{ background: ACCENT, borderRadius: 999, border: "none" }}>
                          Sign up
                        </Button>
                      </Link>
                    </>
                  )}

                  <MobileBar>
                    <Button
                      type="text"
                      icon={<MenuOutlined />}
                      size="large"
                      onClick={() => setDrawerOpen(true)}
                      style={{ color: colors.textSecondary }}
                    />
                  </MobileBar>
                </UserSection>
              </motion.div>
          </AnimatePresence>
        </Capsule>
      </HeaderOuter>

      <Drawer title="Menu" placement="left" onClose={() => setDrawerOpen(false)} open={drawerOpen} bodyStyle={{ padding: 0 }}>
        {isAuthenticated && (
          <div style={{ padding: "16px 0" }}>
            <div
              style={{
                padding: "16px",
                borderBottom: `1px solid ${colors.border}`,
                marginBottom: "16px",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ color: colors.textSecondary, fontSize: "12px" }}>{user?.email}</div>
            </div>

            <div style={{ padding: "0 16px" }}>
              {[
                { to: "/", icon: <HomeOutlined />, label: "Home" },
                { to: "/search", icon: <SearchOutlined />, label: "Find Ride" },
                { to: "/rides/create", icon: <PlusCircleOutlined />, label: "Create Ride" },
                { to: "/rides", icon: <CarOutlined />, label: "My Rides" },
                { to: "/notifications", icon: <BellOutlined />, label: "Notifications" },
                { to: "/profile", icon: <UserOutlined />, label: "Profile" },
                { to: "/vehicles", icon: <CarOutlined />, label: "My Vehicles" },
                { to: "/history", icon: <FileTextOutlined />, label: "Ride History" },
                { to: "/safety", icon: <SearchOutlined />, label: "Safety" },
                ...(user?.role === "ADMIN" ? [{ to: "/admin", icon: <SettingOutlined />, label: "Admin" }] : []),
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 0",
                    borderBottom: `1px solid ${colors.bgTertiary}`,
                    color: colors.textPrimary,
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>

            <div style={{ padding: "16px" }}>
              <Button
                block
                danger
                onClick={() => {
                  setDrawerOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link to="/login">
              <Button block type="default">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button block type="primary" style={{ background: ACCENT }}>
                Sign up
              </Button>
            </Link>
          </div>
        )}
      </Drawer>

      <ContentWrap $fullBleed={isFullBleedPage}>
        <Outlet />
      </ContentWrap>

      {isAuthenticated && (
        <BottomNav>
          <BottomNavItem to="/" $active={location.pathname === "/"}>
            <HomeOutlined />
            Home
          </BottomNavItem>
          <BottomNavItem to="/search" $active={location.pathname === "/search"}>
            <SearchOutlined />
            Search
          </BottomNavItem>
          <BottomNavItem to="/rides" $active={location.pathname === "/rides"}>
            <CarOutlined />
            Rides
          </BottomNavItem>
          <BottomNavItem to="/notifications" $active={location.pathname === "/notifications"}>
            <AntBadge dot={unreadCount > 0} color={ACCENT} offset={[-2, 2]}>
              <BellOutlined />
            </AntBadge>
            Alerts
          </BottomNavItem>
          <BottomNavItem to="/profile" $active={location.pathname === "/profile"}>
            <UserOutlined />
            Profile
          </BottomNavItem>
        </BottomNav>
      )}

      {!isFullBleedPage && <FooterBar>BikeRide — Share your journey. Ride together.</FooterBar>}
    </Layout>
  );
}
