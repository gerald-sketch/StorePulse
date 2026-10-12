import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, type Role } from "@/lib/auth-store";

export function RequireRole({ roles }: { roles: Role[] }) {
  const user = useAuth((s) => s.user);
  const denied = !!user && !roles.includes(user.role);

  useEffect(() => {
    if (denied && user?.role === "STAFF") {
      toast.error("Access Restricted");
    }
  }, [denied, user?.role]);

  if (!user) return <Navigate to="/login" replace />;
  if (denied) {
    return (
      <Navigate
        to={user.role === "STAFF" ? "/sales-history" : "/dashboard"}
        replace
      />
    );
  }
  return <Outlet />;
}
