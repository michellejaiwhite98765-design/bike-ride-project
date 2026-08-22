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

// Modern Header Styling
const HeaderBar = styled(Header)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${colors.bgPrimary};
  border-bottom: 1px solid ${colors.border};
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  box-shadow: ${colors.shadowSm};

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const BrandContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.primary};
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    color: ${colors.primaryDark};
  }

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const DesktopNav = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 32px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const NavItems = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;

  a,
  button {
    color: ${colors.textSecondary};
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 0;

    &:hover {
      color: ${colors.primary};
    }

    &.active {
      color: ${colors.primary};
      border-bottom: 2px solid ${colors.primary};
    }
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const NotificationIcon = styled.div`
  cursor: pointer;
  font-size: 20px;
  color: ${colors.textSecondary};
  transition: color 0.2s ease;
  display: flex;
  align-items: center;

  &:hover {
    color: ${colors.primary};
  }
`;

const MobileBar = styled.div`
  display: none;
  flex: 1;
  align-items: center;
  justify-content: space-between;

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
  color: ${(p) => (p.$active ? colors.primary : colors.textTertiary)};
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  svg {
    font-size: 20px;
  }

  &:hover {
    color: ${colors.primary};
  }
`;

const ContentWrap = styled(Content)`
  padding: 24px 16px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 64px - 70px);
  background: ${colors.bgSecondary};

  @media (max-width: 768px) {
    padding: 16px;
    padding-bottom: 96px;
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
    navigate("/login");
  }

  const isActive = (path) => location.pathname === path ? "active" : "";

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
      <HeaderBar>
        {/* Brand */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <BrandContainer>
            🏍️ <span>BikeRide</span>
          </BrandContainer>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <DesktopNav>
            <NavItems>
              <Link to="/" className={isActive("/")}>
                <HomeOutlined /> Home
              </Link>
              <Link to="/search" className={isActive("/search")}>
                <SearchOutlined /> Find Ride
              </Link>
              <Link to="/rides/create" className={isActive("/rides/create")}>
                <PlusCircleOutlined /> Offer Ride
              </Link>
              <Link to="/rides" className={isActive("/rides")}>
                <CarOutlined /> My Rides
              </Link>
            </NavItems>
          </DesktopNav>
        )}

        {/* User Section */}
        <UserSection>
          {isAuthenticated && (
            <>
              <Link to="/notifications">
                <NotificationIcon>
                  <AntBadge count={0} color={colors.primary}>
                    <BellOutlined style={{ color: colors.textSecondary }} />
                  </AntBadge>
                </NotificationIcon>
              </Link>
              <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={<UserOutlined />}
                  style={{ color: colors.primary }}
                />
              </Dropdown>
            </>
          )}

          {!isAuthenticated && (
            <>
              <Link to="/login">
                <Button type="default" size="middle">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button type="primary" size="middle" style={{ background: colors.primary }}>
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
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
      </HeaderBar>

      {/* Mobile Drawer */}
      <Drawer
        title="Menu"
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        bodyStyle={{ padding: 0 }}
      >
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
                { to: "/rides/create", icon: <PlusCircleOutlined />, label: "Offer Ride" },
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
              <Button block type="primary" style={{ background: colors.primary }}>
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </Drawer>

      {/* Main Content */}
      <ContentWrap>
        <Outlet />
      </ContentWrap>

      {/* Mobile Bottom Navigation */}
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

      {/* Footer */}
      <FooterBar>BikeRide — Share Your Journey. Ride Together.</FooterBar>
    </Layout>
  );
}
