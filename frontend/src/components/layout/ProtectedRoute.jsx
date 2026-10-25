import { Navigate, Outlet, useLocation } from "react-router-dom";
import BrandLoader from "../ui/BrandLoader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BrandLoader variant="fullscreen" label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
