import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  PhilippinePeso,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Package,
  ArrowRight,
  Calendar,
  Plus,
  FileText,
} from "lucide-react";

interface Summary {
  today: { salesTotal: number; salesCount: number };
  mtd: {
    revenue: number;
    salesCount: number;
    expenses: number;
    profit: number;
  };
  inventory: {
    itemCount: number;
    units: number;
    costValue: number;
    retailValue: number;
    lowStockCount: number;
    lowStockItems: { id: string; name: string; sku: string; stock: number }[];
  };
  counts: {
    customers: number;
    suppliers: number;
    employees: number;
    pendingPurchaseOrders: number;
  };
  recentSales: {
    id: string;
    total: string;
    paymentMethod: string;
    paidAt: string;
    customer: { name: string } | null;
    user: { name: string } | null;
  }[];
  daily30d: { day: string; total: number; count: number }[];
}

const CHART_PERIODS = [
  { days: 7, label: "7 days" },
  { days: 15, label: "15 days" },
  { days: 30, label: "1 month" },
] as const;

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  sparkData,
  sparkColor = "hsl(var(--primary))",
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: typeof PhilippinePeso;
  sparkData: { v: number }[];
  sparkColor?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="card-soft card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[13px] text-muted-foreground font-medium">
              {label}
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/60" />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {delta !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {positive ? (
                  <TrendingUp className="h-3 w-3 text-primary" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    positive ? "text-primary" : "text-destructive",
                  )}
                >
                  {positive ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
                {deltaLabel && (
                  <span className="text-[11px] text-muted-foreground">
                    {deltaLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          {sparkData.length > 1 && (
            <div className="w-20 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={sparkColor}
                    strokeWidth={1.75}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<7 | 15 | 30>(15);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get<Summary>("/dashboard/summary")).data,
    refetchInterval: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const firstName = user?.name?.split(" ")[0] ?? "";

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const salesSpark = data.daily30d.slice(-12).map((d) => ({ v: d.total }));
  const ordersSpark = data.daily30d.slice(-12).map((d) => ({ v: d.count }));
  const avgOrder =
    data.mtd.salesCount > 0 ? data.mtd.revenue / data.mtd.salesCount : 0;
  const avgSpark = data.daily30d.slice(-12).map((d) => ({
    v: d.count > 0 ? d.total / d.count : 0,
  }));

  const chartData = data.daily30d.slice(-chartPeriod).map((d) => ({
    day: d.day.slice(5),
    revenue: d.total,
    orders: d.count,
  }));
  const chartPeriodLabel =
    chartPeriod === 30 ? "1 month" : `${chartPeriod} days`;

  return (
    <div className="space-y-5">
      {/* ─── Professional Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Here's what's happening with your business today.
            </p>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {today}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9"
            onClick={() => navigate("/reports")}
          >
            <FileText className="h-3.5 w-3.5 mr-2" />
            <span className="hidden sm:inline">Reports</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9"
            onClick={() => navigate("/products")}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            <span className="hidden sm:inline">Add Product</span>
          </Button>

          <Button
            size="sm"
            className="rounded-xl h-9"
            onClick={() => navigate("/pos")}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-2" />
            <span className="hidden sm:inline">New Sale</span>
          </Button>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="card-soft">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Sales Overview
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revenue and order count over the last {chartPeriodLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-1"
                role="group"
                aria-label="Chart period"
              >
                {CHART_PERIODS.map(({ days, label }) => (
                  <Button
                    key={days}
                    type="button"
                    variant={chartPeriod === days ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs"
                    aria-pressed={chartPeriod === days}
                    onClick={() => setChartPeriod(days)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary/25" />
                  <span className="text-muted-foreground">Orders</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No sales in the last {chartPeriodLabel}.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />

                  <YAxis
                    yAxisId="left"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₱${v}`}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />

                  <XAxis
                    dataKey="day"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(value, name) => {
                      if (name === "revenue" && typeof value === "number")
                        return [peso(value), "Revenue"];
                      if (name === "orders")
                        return [`${value} orders`, "Orders"];
                      return [String(value ?? ""), String(name)];
                    }}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={22}
                  />

                  <Bar
                    yAxisId="right"
                    dataKey="orders"
                    fill="hsl(var(--primary) / 0.25)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StatCard
            label="Today's Sales"
            value={peso(data.today.salesTotal)}
            icon={PhilippinePeso}
            sparkData={salesSpark}
          />

          <StatCard
            label="MTD Revenue"
            value={peso(data.mtd.revenue)}
            icon={ShoppingCart}
            sparkData={ordersSpark}
          />

          <StatCard
            label="Avg Order Value"
            value={peso(avgOrder)}
            icon={TrendingUp}
            sparkData={avgSpark}
          />

          <StatCard
            label="Inventory Value"
            value={peso(data.inventory.costValue)}
            icon={Package}
            sparkData={salesSpark}
          />
        </div>
      </div>

      {/* ─── Bottom Row ─── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="card-soft lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Sales
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate("/reports")}
            >
              View reports <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sales yet. Ring your first sale from the POS.
              </p>
            ) : (
              <div className="space-y-1">
                {data.recentSales.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
                        {(s.customer?.name ?? "WI").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.customer?.name ?? "Walk-in"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(s.paidAt).toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.user?.name && ` · ${s.user.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border/60 text-muted-foreground"
                      >
                        {s.paymentMethod}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {peso(Number(s.total))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="card-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customers</span>
                <span className="font-semibold tabular-nums">
                  {data.counts.customers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Suppliers</span>
                <span className="font-semibold tabular-nums">
                  {data.counts.suppliers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Employees</span>
                <span className="font-semibold tabular-nums">
                  {data.counts.employees}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending POs</span>
                <span className="font-semibold tabular-nums">
                  {data.counts.pendingPurchaseOrders}
                </span>
              </div>
            </CardContent>
          </Card>

          {data.inventory.lowStockCount > 0 && (
            <Card className="card-soft border-destructive/30 bg-destructive/[0.03]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.inventory.lowStockItems.slice(0, 4).map((i) => (
                    <div
                      key={i.id}
                      className="flex justify-between items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{i.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {i.sku}
                        </p>
                      </div>
                      <Badge
                        variant={i.stock === 0 ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {i.stock} left
                      </Badge>
                    </div>
                  ))}
                </div>
                {data.inventory.lowStockCount > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => navigate("/inventory")}
                  >
                    View all {data.inventory.lowStockCount} items
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
