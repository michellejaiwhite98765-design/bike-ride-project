import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Dropdown, Drawer, Button, Badge as AntBadge } from "antd";
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
} from "@ant-design/icons";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext.jsx";
import { locationService } from "../../services/locationService.js";
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
.wordmark{
  font-size:21px;
}
  @media (max-width: 1024px) {
    gap: 12px;
    padding: ${(p) => (p.$scrolled ? "8px 10px" : "10px 16px")};
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

  @media (max-width: 768px) {
    span.wordmark {
      display: none;
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

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const NotificationIcon = styled.div`
  cursor: pointer;
  font-size: 18px;
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
`;

const ContentWrap = styled(Content)`
  padding: 8px 16px 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 76px - 70px);
  background: ${colors.bgSecondary};

  @media (max-width: 768px) {
    padding: 8px 16px 96px;
  }
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !window.localStorage.getItem("location_permission_requested")) {
      requestLocationPermission();
    }
  }, [isAuthenticated]);

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
    navigate("/");
  }

  const isActive = (path) => (location.pathname === path ? "active" : "");

  const userMenu = {
    items: [
      { key: "profile", label: <Link to="/profile">Profile</Link> },
      { key: "vehicles", label: <Link to="/vehicles">My Vehicles</Link> },
      { key: "history", label: <Link to="/history">Ride History</Link> },
      { key: "safety", label: <Link to="/safety">Safety</Link> },
      ...(user?.role === "ADMIN" ? [{ key: "admin", label: <Link to="/admin">Admin</Link> }] : []),
      { type: "divider" },
      { key: "logout", label: "Logout", onClick: handleLogout, icon: <LogoutOutlined /> },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderOuter $scrolled={scrolled}>
        <Capsule $scrolled={scrolled}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <BrandContainer>
              {/* <BrandMark>B</BrandMark> */}
              <span className="wordmark">Liftshare</span>
            </BrandContainer>
          </Link>

          {isAuthenticated && (
            <DesktopNav>
              <NavItems>
                <Link to="/" className={isActive("/")}>
                  Home
                </Link>
                <Link to="/search" className={isActive("/search")}>
                  Find ride
                </Link>
                <Link to="/rides" className={isActive("/rides")}>
                  My rides
                </Link>
              </NavItems>
              <CtaLink to="/rides/create">
                <PlusCircleOutlined /> Create ride
              </CtaLink>
            </DesktopNav>
          )}

          <UserSection>
            {isAuthenticated && (
              <>
                <Link to="/notifications">
                  <NotificationIcon>
                    <AntBadge count={0} color={ACCENT}>
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
                <Link to="/login">
                  <Button type="default" size="middle" style={{ borderRadius: 999 }}>
                    Login
                  </Button>
                </Link>
                <Link to="/register">
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

      <ContentWrap>
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
            <BellOutlined />
            Alerts
          </BottomNavItem>
          <BottomNavItem to="/profile" $active={location.pathname === "/profile"}>
            <UserOutlined />
            Profile
          </BottomNavItem>
        </BottomNav>
      )}

      <FooterBar>BikeRide — Share your journey. Ride together.</FooterBar>
    </Layout>
  );
}
