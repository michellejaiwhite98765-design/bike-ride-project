import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import BrandLoader from "./components/ui/BrandLoader.jsx";
import { useAuth } from "./context/AuthContext.jsx";

import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LicencePage from "./pages/LicencePage.jsx";
import VehiclesPage from "./pages/vehicles/VehiclesPage.jsx";
// import VehicleFormPage from "./pages/vehicles/VehicleFormPage.jsx";
import VehicleFormPage from "../src/pages/vehicles/VehicleFormPage.jsx"
import MyRidesPage from "./pages/rides/MyRidesPage.jsx";
import CreateRidePage from "./pages/rides/CreateRidePage.jsx";
import RideDetailsPage from "./pages/rides/RideDetailsPage.jsx";
import RideRequestsPage from "./pages/rides/RideRequestsPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import BookingsPage from "./pages/bookings/BookingsPage.jsx";
import BookingDetailsPage from "./pages/bookings/BookingDetailsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import RatingsPage from "./pages/RatingsPage.jsx";
import SafetyPage from "./pages/SafetyPage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

// Signed-in users land on Find Ride; visitors go straight to the login page.
function HomeRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <SearchPage /> : <Navigate to="/login" replace />;
}

export default function App() {
  // Hold every page (login, home, ...) until the saved session is checked, so
  // the app opens straight on the right screen instead of flashing the guest
  // view first.
  const { loading } = useAuth();
  if (loading) return <BrandLoader variant="fullscreen" label="Getting your rides ready…" />;

  return (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfilePage editing />} />
          <Route path="/profile/licence" element={<LicencePage />} />

          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/add" element={<VehicleFormPage />} />
          <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />

          <Route path="/rides" element={<MyRidesPage key="rides" />} />
          <Route path="/rides/create" element={<CreateRidePage />} />
          <Route path="/rides/:id" element={<RideDetailsPage />} />
          <Route path="/rides/:id/edit" element={<CreateRidePage />} />
          <Route path="/rides/:id/requests" element={<RideRequestsPage />} />

          <Route path="/search" element={<Navigate to="/" replace />} />

          <Route path="/bookings" element={<MyRidesPage key="bookings" mode="bookings" />} />
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
          <Route path="/payments" element={<BookingsPage />} />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/ratings" element={<RatingsPage />} />
          <Route path="/safety" element={<SafetyPage />} />

          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
