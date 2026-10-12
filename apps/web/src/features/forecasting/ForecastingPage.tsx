import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  Info,
  Skull,
  TrendingDown as SlowIcon,
} from "lucide-react";
import type { ForecastItem, ReorderAlert } from "./use-forecasting";
import { PageHeader } from "@/components/layout/PageHeader";

function pesoCompact(n: number) {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

// ─── Reorder Alert Row ───
function AlertRow({ alert }: { alert: ReorderAlert }) {
  const urgencyStyles = {
    CRITICAL: "border-destructive/40 bg-destructive/[0.03]",
    WARNING: "border-amber-500/40 bg-amber-500/[0.03]",
    WATCH: "border-border/60 bg-muted/20",
  };
  const urgencyBadge = {
    CRITICAL: "destructive",
    WARNING: "secondary",
    WATCH: "outline",
  } as const;
  const urgencyLabel = {
    CRITICAL: "Out soon",
    WARNING: "Running low",
    WATCH: "Monitor",
  };

  const stockPct =
    alert.reorderPoint > 0
      ? Math.min(100, (alert.stock / alert.reorderPoint) * 100)
      : 100;

  return (
    <div className={cn("rounded-xl border p-4", urgencyStyles[alert.urgency])}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{alert.name}</p>
            <Badge
              variant={urgencyBadge[alert.urgency]}
              className="text-[10px] shrink-0"
            >
              {urgencyLabel[alert.urgency]}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {alert.sku}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums leading-none">
            {alert.stock}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">in stock</p>
        </div>
      </div>

      {/* Stock level bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn(
            "h-full transition-all",
            alert.urgency === "CRITICAL"
              ? "bg-destructive"
              : alert.urgency === "WARNING"
                ? "bg-amber-500"
                : "bg-primary",
          )}
          style={{ width: `${stockPct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Velocity</p>
          <p className="font-medium tabular-nums mt-0.5">
            {alert.dailyVelocity.toFixed(1)}/day
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Runs out</p>
          <p className="font-medium mt-0.5">
            {alert.daysRemaining === 0
              ? "Today"
              : alert.daysRemaining === 1
                ? "1 day"
                : `${alert.daysRemaining} days`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Order</p>
          <p className="font-medium tabular-nums text-primary mt-0.5">
            +{alert.suggestedOrderQty}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Product Row ───
function ProductRow({
  item,
  showVelocity = true,
  showTrend = true,
  showValue = false,
}: {
  item: ForecastItem;
  showVelocity?: boolean;
  showTrend?: boolean;
  showValue?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-[11px] text-muted-foreground font-mono">
          {item.sku}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {showVelocity && (
          <div className="text-right w-20">
            <p className="text-sm font-semibold tabular-nums">
              {item.recentUnits}
            </p>
            <p className="text-[10px] text-muted-foreground">in {30}d</p>
          </div>
        )}
        {showTrend && item.trend !== null && (
          <div className="text-right w-16">
            <div
              className={cn(
                "flex items-center gap-1 justify-end text-xs font-medium",
                item.trendDirection === "up"
                  ? "text-primary"
                  : item.trendDirection === "down"
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              {item.trendDirection === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : item.trendDirection === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              <span className="tabular-nums">
                {item.trend > 0 ? "+" : ""}
                {item.trend.toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">vs prev 30d</p>
          </div>
        )}
        {showValue && (
          <div className="text-right w-20">
            <p className="text-sm font-semibold tabular-nums">
              {pesoCompact(item.stockValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {item.stock} units
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ───
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
  icon: typeof Package;
  tone?: "default" | "warning" | "danger" | "primary";
}) {
  const tones = {
    default: { bg: "bg-muted/50", fg: "text-muted-foreground" },
    warning: { bg: "bg-amber-500/10", fg: "text-amber-600" },
    danger: { bg: "bg-destructive/10", fg: "text-destructive" },
    primary: { bg: "bg-primary/10", fg: "text-primary" },
  };
  const t = tones[tone];

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
              t.bg,
            )}
          >
            <Icon className={cn("h-4 w-4", t.fg)} />
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

// ─── Main Page ───
export function ForecastingPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["forecasting", "insights"],
    queryFn: async () => (await api.get("/forecasting/insights")).data,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const hasData = data.summary.totalProducts > 0;
  const hasSales = data.summary.activeProducts > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory Intelligence"
        description={`Predictions based on the last ${data.windowDays} days of sales`}
      >
        <Badge
          variant="outline"
          className="border-border/60"
        >
          <Calendar className="h-3 w-3 mr-1.5" />
          {new Date(data.generatedAt).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Badge>
      </PageHeader>

      {/* ─── Empty states ─── */}
      {!hasData && (
        <Card className="card-soft border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              Add products and start selling. Predictions appear once we have
              sales history to analyze.
            </p>
            <Button
              onClick={() => navigate("/products")}
              className="rounded-xl"
            >
              Add products
            </Button>
          </CardContent>
        </Card>
      )}

      {hasData && !hasSales && (
        <Card className="card-soft border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              No sales activity yet
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              Forecasts need at least a few sales to be meaningful. Ring your
              first sale from the POS.
            </p>
            <Button onClick={() => navigate("/pos")} className="rounded-xl">
              Go to POS
            </Button>
          </CardContent>
        </Card>
      )}

      {hasData && hasSales && (
        <>
          {/* ─── Summary cards ─── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active products"
              value={data.summary.activeProducts.toString()}
              sub={`of ${data.summary.totalProducts} total`}
              icon={TrendingUp}
              tone="primary"
            />
            <StatCard
              label="Will run out soon"
              value={data.summary.willRunOutSoonCount.toString()}
              sub={`within ${data.leadTimeDays} days`}
              icon={AlertTriangle}
              tone={
                data.summary.willRunOutSoonCount > 0 ? "warning" : "default"
              }
            />
            <StatCard
              label="Dead stock"
              value={data.summary.deadProducts.toString()}
              sub="no sales in 30 days"
              icon={Skull}
              tone={data.summary.deadProducts > 0 ? "danger" : "default"}
            />
            <StatCard
              label="Stock value"
              value={pesoCompact(data.summary.totalStockValue)}
              sub="at cost"
              icon={Package}
            />
          </div>

          {/* ─── Reorder alerts + patterns ─── */}
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Card className="card-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Reorder Alerts
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Products that will run out within {data.leadTimeDays} days
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.reorderAlerts.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">All stocked up</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No products are running low right now.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.reorderAlerts.map((alert: ReorderAlert) => (
                      <AlertRow key={alert.productId} alert={alert} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-soft h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Busiest Days
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last 60 days by day of week
                </p>
              </CardHeader>
              <CardContent>
                {data.patterns.busiestDay && (
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Busiest day</p>
                    <p className="font-semibold">{data.patterns.busiestDay}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.patterns.busiestDayMultiplier.toFixed(1)}× the
                      weekly average
                    </p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.patterns.dailyBreakdown}
                    margin={{ top: 5, right: 0, bottom: 0, left: -25 }}
                  >
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
                      tickFormatter={(v: string) => v.slice(0, 3)}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
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
                      }}
                      formatter={(value: unknown) => [
                        `${value ?? 0} units`,
                        "Sold",
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Bar
                      dataKey="units"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ─── Fast movers + Slow movers ─── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="card-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Fast Movers
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Top sellers in the last {data.windowDays} days
                </p>
              </CardHeader>
              <CardContent>
                {data.fastMovers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No fast-moving products yet.
                  </p>
                ) : (
                  <div>
                    {data.fastMovers.map((item: ForecastItem) => (
                      <ProductRow
                        key={item.productId}
                        item={item}
                        showVelocity
                        showTrend
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <SlowIcon className="h-4 w-4 text-amber-500" />
                  Slow Movers
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selling, but below average velocity
                </p>
              </CardHeader>
              <CardContent>
                {data.slowMovers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No slow-moving products yet.
                  </p>
                ) : (
                  <div>
                    {data.slowMovers.map((item: ForecastItem) => (
                      <ProductRow
                        key={item.productId}
                        item={item}
                        showVelocity
                        showTrend
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Dead stock ─── */}
          {data.deadStock.length > 0 && (
            <Card className="card-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Skull className="h-4 w-4 text-destructive" />
                  Dead Stock
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No sales in the last {data.windowDays} days — capital tied up
                  in inventory
                </p>
              </CardHeader>
              <CardContent>
                <div>
                  {data.deadStock.map((item: ForecastItem) => (
                    <ProductRow
                      key={item.productId}
                      item={item}
                      showVelocity={false}
                      showTrend={false}
                      showValue
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/60">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Consider discounting or bundling these to free up cash.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Methodology note ─── */}
          <Card className="card-soft bg-muted/20 border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>
                    <strong className="text-foreground">How this works:</strong>{" "}
                    Predictions use a moving average of unit sales over the last{" "}
                    {data.windowDays} days. Reorder points assume a{" "}
                    {data.leadTimeDays}-day supplier lead time plus{" "}
                    {data.safetyStockDays} days of safety stock. Suggested order
                    quantities target 30 days of cover.
                  </p>
                  <p>
                    This is a statistical forecast, not machine learning. It
                    does not account for promotions, holidays, or seasonality
                    beyond day-of-week patterns.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
