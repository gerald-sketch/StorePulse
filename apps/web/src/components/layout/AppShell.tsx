import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type Role, type AuthUser } from "@/lib/auth-store";
import { logout } from "@/features/auth/use-auth";
import { BranchSwitcher } from "./BranchSwitcher";
import { PwaStatus } from "@/components/pwa/PwaStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  ClipboardList,
  Wallet,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  History,
  Menu,
  X,
  ChevronUp,
  Sparkles,
  Award,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles?: Role[];
}

const pagesWithOwnHeader = new Set([
  "/dashboard",
  "/reports",
  "/pos",
  "/products",
  "/inventory",
  "/customers",
  "/suppliers",
  "/purchases",
  "/expenses",
  "/forecasting",
  "/team",
  "/employees",
]);

const mainNav: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    roles: ["OWNER", "MANAGER"],
  },
  {
    to: "/sales-history",
    label: "Sales History",
    icon: History,
    exact: true,
    roles: ["STAFF"],
  },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
];

const operationsNav: NavItem[] = [
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchases", label: "Purchases", icon: ClipboardList },
  {
    to: "/expenses",
    label: "Expenses",
    icon: Wallet,
    roles: ["OWNER", "MANAGER"],
  },
];

const insightsNav: NavItem[] = [
  {
    to: "/forecasting",
    label: "Intelligence",
    icon: Sparkles,
    roles: ["OWNER", "MANAGER"],
  },
  {
    to: "/team",
    label: "Team Performance",
    icon: Award,
    roles: ["OWNER", "MANAGER"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["OWNER", "MANAGER"],
  },
  {
    to: "/employees",
    label: "Employees",
    icon: UserCog,
    roles: ["OWNER", "MANAGER"],
  },
  { to: "/settings", label: "Settings", icon: Settings },
];

function filterByRole(items: NavItem[], role?: Role) {
  return items.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );
}

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title?: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pt-4 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

function UserMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login");
  }

  function goTo(path: string) {
    setOpen(false);
    navigate(path);
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel =
    user.role === "OWNER"
      ? "Owner"
      : user.role === "MANAGER"
        ? "Manager"
        : "Staff";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "w-full flex items-center gap-2 rounded-xl px-3 py-2 transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open ? "bg-muted/70" : "hover:bg-muted/70",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate leading-tight">
              {user.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {roleLabel}
            </p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              open && "rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground leading-none">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => goTo("/settings")}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" /> Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => goTo("/employees")}
          className="cursor-pointer"
        >
          <UserCog className="h-4 w-4 mr-2" /> My profile
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  onCloseMobile,
  showCloseButton,
}: {
  onCloseMobile: () => void;
  showCloseButton: boolean;
}) {
  const user = useAuth((s) => s.user);
  if (!user) return null;

  const role = user.role;
  const main = filterByRole(mainNav, role);
  const ops = filterByRole(operationsNav, role);
  const insights = filterByRole(insightsNav, role);

  return (
    <>
      <div className="px-4 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/storepulse-mark.svg" alt="" className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-semibold text-[15px] leading-tight">
              StorePulse
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {user.businessName}
            </p>
          </div>
        </div>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <NavSection items={main} onNavigate={onCloseMobile} />
        {ops.length > 0 && (
          <NavSection
            title="Operations"
            items={ops}
            onNavigate={onCloseMobile}
          />
        )}
        {insights.length > 0 && (
          <NavSection
            title="Manage"
            items={insights}
            onNavigate={onCloseMobile}
          />
        )}
      </nav>

      <div className="px-3 py-3 border-t border-border/60 shrink-0">
        <UserMenu user={user} />
      </div>
    </>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 bg-card border-r border-border flex-col sticky top-0 h-screen">
        <SidebarContent onCloseMobile={closeMobile} showCloseButton={false} />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:hidden h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onCloseMobile={closeMobile} showCloseButton={true} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img src="/storepulse-mark.svg" alt="" className="h-7 w-7 shrink-0" />
            <h1 className="font-semibold text-base">StorePulse</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
            {!pagesWithOwnHeader.has(location.pathname) && (
              <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                <PwaStatus />
                <BranchSwitcher />
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
