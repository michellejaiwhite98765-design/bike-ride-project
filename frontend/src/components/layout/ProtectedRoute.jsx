import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppLoader from "../ui/AppLoader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
