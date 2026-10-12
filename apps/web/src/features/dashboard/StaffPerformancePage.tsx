import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Crown,
  Award,
  Clock,
  User,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { useStaffOverview, type StaffSummary } from "./use-staff-performance";
import { StaffDetailDialog } from "./StaffDetailDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

function pesoCompact(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "No sales yet";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  tone?: "default" | "primary";
}) {
  return (
    <Card className="card-soft">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-muted-foreground font-medium">
            {label}
          </span>
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              tone === "primary" ? "bg-primary/10" : "bg-muted/50",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                tone === "primary" ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function StaffCard({
  staff,
  rank,
  onClick,
}: {
  staff: StaffSummary;
  rank: number;
  onClick: () => void;
}) {
  const initials = staff.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isTop = rank === 1 && staff.revenue > 0;
  const hasSales = staff.salesCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-xl border bg-card p-4 transition-all w-full",
        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        "active:scale-[0.99]",
        isTop ? "border-primary/40" : "border-border/60",
      )}
    >
      {isTop && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm">
          <Crown className="h-3 w-3" />
          TOP PERFORMER
        </div>
      )}

      <div className="mb-4 flex flex-col items-center gap-3 text-center">
        <div
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            hasSales
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials}
        </div>
        <div className="w-full min-w-0">
          <p className="break-words font-semibold leading-tight">
            {staff.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 px-2 text-[10px] font-medium"
            >
              {ROLE_LABEL[staff.role]}
            </Badge>
            {!hasSales && (
              <span className="text-[10px] text-muted-foreground">
                No sales
              </span>
            )}
          </div>
          <p className="mt-2 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Mail className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">{staff.email}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Total Revenue
          </p>
          <p className="text-lg font-bold tabular-nums mt-0.5">
            {pesoCompact(staff.revenue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Sales
          </p>
          <p className="text-lg font-bold tabular-nums mt-0.5">
            {staff.salesCount}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
        <div>
          <span className="text-muted-foreground">Today: </span>
          <span className="font-medium tabular-nums">
            {pesoCompact(staff.todayRevenue)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeAgo(staff.lastSaleAt)}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function OwnerCard({
  owner,
  onClick,
}: {
  owner: StaffSummary;
  onClick: () => void;
}) {
  const initials = owner.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-xl border border-border/60 bg-card p-4 transition-all w-full",
        "hover:border-primary/40 hover:shadow-md",
        "active:scale-[0.99]",
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate leading-tight">{owner.name}</p>
            <Badge variant="secondary" className="text-[10px] h-5">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Owner
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {owner.email}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">
            {pesoCompact(owner.revenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {owner.salesCount} sales
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Today
          </p>
          <p className="font-medium tabular-nums mt-0.5">
            {pesoCompact(owner.todayRevenue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            This Month
          </p>
          <p className="font-medium tabular-nums mt-0.5">
            {pesoCompact(owner.mtdRevenue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Last Sale
          </p>
          <p className="font-medium mt-0.5">{timeAgo(owner.lastSaleAt)}</p>
        </div>
      </div>
    </button>
  );
}

export function StaffPerformancePage() {
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data, isLoading } = useStaffOverview();
  const allUsers = data?.staff;

  // ─── Split owner from staff ───
  const owners = useMemo(
    () => (allUsers ?? []).filter((u) => u.role === "OWNER"),
    [allUsers],
  );
  const staff = useMemo(
    () => (allUsers ?? []).filter((u) => u.role !== "OWNER"),
    [allUsers],
  );

  const stats = useMemo(() => {
    const activeStaff = staff.filter((s) => s.salesCount > 0);
    const staffRevenue = staff.reduce((sum, s) => sum + s.revenue, 0);
    const ownerRevenue = owners.reduce((sum, o) => sum + o.revenue, 0);
    const topPerformer =
      activeStaff.length > 0
        ? [...activeStaff].sort((a, b) => b.mtdRevenue - a.mtdRevenue)[0]
        : null;

    return {
      staffCount: staff.length,
      activeStaffCount: activeStaff.length,
      todayRevenue: data?.todayRevenue ?? 0,
      staffRevenue,
      ownerRevenue,
      topPerformer,
      avgPerStaff:
        activeStaff.length > 0 ? staffRevenue / activeStaff.length : 0,
    };
  }, [staff, owners, data?.todayRevenue]);

  if (isLoading || !allUsers) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team Performance"
        description="Monitor sales by staff member"
      />

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Team Size"
          value={stats.staffCount.toString()}
          sub={`${stats.activeStaffCount} with sales`}
          icon={Users}
        />
        <StatCard
          label="Today's Sales"
          value={pesoCompact(stats.todayRevenue)}
          sub="All business sales"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Staff Revenue"
          value={pesoCompact(stats.staffRevenue)}
          sub="All-time, staff only"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Top Performer"
          value={
            stats.topPerformer
              ? pesoCompact(stats.topPerformer.mtdRevenue)
              : "—"
          }
          sub={stats.topPerformer?.name ?? "No staff sales yet"}
          icon={Crown}
          tone={stats.topPerformer ? "primary" : "default"}
        />
        <StatCard
          label="Average per Staff"
          value={pesoCompact(stats.avgPerStaff)}
          sub="Lifetime average"
          icon={Award}
        />
      </div>

      {/* ─── Owner activity ─── */}
      {owners.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Owner Activity
            </h2>
            <span className="text-xs text-muted-foreground">
              · Not included in staff leaderboard
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {owners.map((o) => (
              <OwnerCard
                key={o.id}
                owner={o}
                onClick={() => setSelectedUserId(o.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Staff leaderboard ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Staff Performance
          </h2>
        </div>

        {staff.length === 0 ? (
          <Card className="card-soft border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                No staff members yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">
                Add staff accounts to start tracking their sales performance.
              </p>
              <Button
                className="rounded-xl"
                onClick={() => navigate("/employees")}
              >
                Add staff
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staff.map((s, i) => (
              <StaffCard
                key={s.id}
                staff={s}
                rank={i + 1}
                onClick={() => setSelectedUserId(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <StaffDetailDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
