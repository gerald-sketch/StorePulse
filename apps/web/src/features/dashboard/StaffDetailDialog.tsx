import { useState } from "react";
import { useStaffDetail, useStaffProductSales } from "./use-staff-performance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Award,
  Clock,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Mail,
  CalendarDays,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  CASH: Banknote,
  GCASH: Smartphone,
  MAYA: Smartphone,
  CARD: CreditCard,
  BANK_TRANSFER: Building2,
};

interface Props {
  userId: string | null;
  onClose: () => void;
}

const BUSINESS_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function businessToday() {
  return new Date(Date.now() + BUSINESS_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function shiftBusinessDate(day: string, days: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatBusinessDate(day: string) {
  return new Date(`${day}T12:00:00+08:00`).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function StaffDetailDialog({ userId, onClose }: Props) {
  const { data, isLoading } = useStaffDetail(userId);
  const [to, setTo] = useState(businessToday);
  const [from, setFrom] = useState(() => shiftBusinessDate(businessToday(), -13));
  const productSales = useStaffProductSales(userId, from, to);

  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        {isLoading || !data ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-border/60 pb-5 pr-8">
              <div className="flex items-center gap-3 text-left sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-lg font-bold text-primary">
                  {data.staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <DialogTitle className="break-words text-xl font-semibold leading-tight sm:text-2xl">
                      {data.staff.name}
                    </DialogTitle>
                    <Badge
                      variant="secondary"
                      className="border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {ROLE_LABEL[data.staff.role]}
                    </Badge>
                  </div>
                  <DialogDescription className="mt-2 flex min-w-0 items-start justify-start gap-2 text-sm leading-relaxed">
                    <Mail
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-all">
                      {data.staff.email}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <StatBox
                label="Total Revenue"
                value={peso(data.staff.revenue)}
                sub={`${data.staff.salesCount} sales all time`}
                tone="primary"
              />
              <StatBox
                label="Today"
                value={peso(data.staff.todayRevenue)}
                sub={`${data.staff.todayCount} sales`}
              />
              <StatBox
                label="This Month"
                value={peso(data.staff.mtdRevenue)}
                sub={`${data.staff.mtdCount} sales`}
              />
              <StatBox
                label="Average Sale"
                value={peso(data.staff.avgSale)}
                sub="per transaction"
              />
            </div>

            {/* Daily chart */}
            <div className="mt-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Last 14 Days
              </h3>
              {data.daily14d.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-xl">
                  No sales in the last 14 days
                </p>
              ) : (
                <div className="rounded-xl border border-border/60 p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.daily14d}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₱${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(value) => [
                          peso(Number(value ?? 0)),
                          "Revenue",
                        ]}
                        labelFormatter={(label) => `Date: ${label ?? ""}`}
                      />
                      <Bar
                        dataKey="total"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Two columns: top products + payment breakdown */}
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {/* Top products */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Top Products
                </h3>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-muted/20 rounded-xl">
                    No product sales yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.topProducts.map((p, i) => (
                      <div
                        key={p.productId}
                        className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                      >
                        <span
                          className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0",
                            i === 0
                              ? "bg-amber-500/15 text-amber-600"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {p.sku}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">
                            {peso(p.revenue)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.unitsSold} sold
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment breakdown */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  Payment Methods
                </h3>
                {data.paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center bg-muted/20 rounded-xl">
                    No payments yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.paymentBreakdown.map((p) => {
                      const Icon = PAYMENT_ICONS[p.method] ?? Banknote;
                      const totalAll = data.paymentBreakdown.reduce(
                        (sum, x) => sum + x.total,
                        0,
                      );
                      const pct =
                        totalAll > 0
                          ? Math.round((p.total / totalAll) * 100)
                          : 0;
                      return (
                        <div
                          key={p.method}
                          className="rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium flex-1">
                              {p.method.replace("_", " ")}
                            </span>
                            <span className="text-sm font-semibold tabular-nums">
                              {peso(p.total)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {p.count}{" "}
                            {p.count === 1 ? "transaction" : "transactions"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent sales */}
            <div className="mt-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Sales
              </h3>
              {data.recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center bg-muted/20 rounded-xl">
                  No sales recorded yet
                </p>
              ) : (
                <div className="divide-y divide-border/40 rounded-xl border border-border/60 overflow-hidden">
                  {data.recentSales.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.customerName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(s.paidAt).toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {s.paymentMethod.replace("_", " ")}
                        </Badge>
                        <span className="text-sm font-semibold tabular-nums">
                          {peso(s.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products sold by business day */}
            <div className="mt-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-muted-foreground" />
                Products Sold by Day
              </h3>
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border/60 p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-sales-from">From</Label>
                  <Input
                    id="staff-sales-from"
                    type="date"
                    value={from}
                    max={to || businessToday()}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-sales-to">To</Label>
                  <Input
                    id="staff-sales-to"
                    type="date"
                    value={to}
                    min={from}
                    max={businessToday()}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </div>
              </div>

              {from > to ? (
                <p className="text-sm text-muted-foreground">
                  Choose a start date on or before the end date.
                </p>
              ) : productSales.isLoading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : productSales.isError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/30 p-4 text-center"
                >
                  <p className="text-sm text-destructive">
                    Could not load sold-product history.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void productSales.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : productSales.data?.days.length === 0 ? (
                <p className="rounded-xl bg-muted/20 py-6 text-center text-sm text-muted-foreground">
                  No products sold in this date range.
                </p>
              ) : (
                <div className="space-y-3">
                  {productSales.data?.days.map((day) => (
                    <section
                      key={day.day}
                      className="overflow-hidden rounded-xl border border-border/60"
                    >
                      <h4 className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5 text-xs font-semibold">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatBusinessDate(day.day)}
                      </h4>
                      <div className="divide-y divide-border/40 px-3">
                        {day.items.map((item) => (
                          <div
                            key={`${item.productId}-${item.sku}-${item.name}`}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {item.sku} · {item.salesCount}{" "}
                                {item.salesCount === 1 ? "sale" : "sales"}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold tabular-nums">
                                {item.unitsSold} sold
                              </p>
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                {peso(item.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "primary"
          ? "border-primary/30 bg-primary/5"
          : "border-border/60 bg-card",
      )}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums mt-1",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
