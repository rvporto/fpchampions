import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (profile && !profile.profile_completed && loc.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
