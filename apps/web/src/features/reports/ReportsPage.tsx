import { useState } from "react";
import {
  useSalesSummary,
  useProfitLoss,
  useInventoryValuation,
  useTopProducts,
  type ReportDateRange,
} from "./use-reports";
import { api, apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { PwaStatus } from "@/components/pwa/PwaStatus";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BarChart3,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Award,
  Download,
  Loader2,
  ShoppingCart,
} from "lucide-react";

type GroupBy = "day" | "week" | "month";
type ReportTab = "sales" | "pl" | "inventory" | "top";
const BUSINESS_UTC_OFFSET_HOURS = 8;

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function businessToday() {
  return new Date(Date.now() + BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function toApiRange(from: string, to: string): ReportDateRange {
  return {
    from: new Date(
      `${from}T00:00:00.000+0${BUSINESS_UTC_OFFSET_HOURS}:00`,
    ).toISOString(),
    to: new Date(
      `${shiftDate(to, 1)}T00:00:00.000+0${BUSINESS_UTC_OFFSET_HOURS}:00`,
    ).toISOString(),
  };
}

function startOfBusinessWeek(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const today = businessToday();
  const [dateRange, setDateRange] = useState(() => ({
    from: shiftDate(today, -29),
    to: today,
  }));
  const [downloading, setDownloading] = useState(false);
  const apiRange = toApiRange(dateRange.from, dateRange.to);

  const summary = useSalesSummary(groupBy, apiRange);
  const pl = useProfitLoss(apiRange);
  const valuation = useInventoryValuation();
  const top = useTopProducts(apiRange);

  async function downloadCsv() {
    setDownloading(true);
    try {
      const res = await api.get("/reports/export/sales.csv", {
        responseType: "blob",
        params: apiRange,
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-${dateRange.from}-to-${dateRange.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Sales report downloaded");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  const chartData = (summary.data?.rows ?? []).map((r) => {
    const isCurrentPeriod =
      groupBy === "day"
        ? r.period === today
        : groupBy === "week"
          ? r.period === startOfBusinessWeek(today)
          : r.period.slice(0, 7) === today.slice(0, 7);
    return {
      period:
        groupBy === "month"
          ? r.period.slice(0, 7)
          : groupBy === "week"
            ? `Week of ${r.period.slice(5)}`
            : r.period.slice(5),
      total: r.total,
      subtotal: r.subtotal,
      discount: r.discount,
      isCurrentPeriod,
    };
  });

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Reports
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Business insights and analytics
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
            <PwaStatus />
            <BranchSwitcher />
          </div>
          <Button
            variant="outline"
            onClick={downloadCsv}
            disabled={downloading}
            className="h-10 w-full shrink-0 rounded-xl border-slate-200 px-4 text-slate-700 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 sm:w-auto"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Downloading..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReportTab)}
        className="space-y-5"
      >
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:inline-flex sm:w-auto sm:grid-cols-none">
            <TabsTrigger
              value="sales"
              className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-xs leading-tight data-[state=active]:bg-white data-[state=active]:text-teal-800 data-[state=active]:shadow-sm sm:px-4 sm:text-sm"
            >
              Sales
            </TabsTrigger>
            <TabsTrigger
              value="pl"
              className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-xs leading-tight data-[state=active]:bg-white data-[state=active]:text-teal-800 data-[state=active]:shadow-sm sm:px-4 sm:text-sm"
            >
              Profit &amp; Loss
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-xs leading-tight data-[state=active]:bg-white data-[state=active]:text-teal-800 data-[state=active]:shadow-sm sm:px-4 sm:text-sm"
            >
              Inventory
            </TabsTrigger>
            <TabsTrigger
              value="top"
              className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-xs leading-tight data-[state=active]:bg-white data-[state=active]:text-teal-800 data-[state=active]:shadow-sm sm:px-4 sm:text-sm"
            >
              Top Products
            </TabsTrigger>
          </TabsList>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {activeTab !== "inventory" && (
              <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
                <legend className="sr-only">Report date range</legend>
                <label className="sr-only" htmlFor="reports-from">
                  Start date
                </label>
                <input
                  id="reports-from"
                  type="date"
                  value={dateRange.from}
                  max={dateRange.to}
                  onChange={(event) => {
                    if (event.target.value) {
                      setDateRange((range) => ({
                        ...range,
                        from: event.target.value,
                      }));
                    }
                  }}
                  className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 sm:w-auto sm:px-3 sm:text-sm"
                />
                <span className="text-xs text-slate-400">to</span>
                <label className="sr-only" htmlFor="reports-to">
                  End date
                </label>
                <input
                  id="reports-to"
                  type="date"
                  value={dateRange.to}
                  min={dateRange.from}
                  max={today}
                  onChange={(event) => {
                    if (event.target.value) {
                      setDateRange((range) => ({
                        ...range,
                        to: event.target.value,
                      }));
                    }
                  }}
                  className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 sm:w-auto sm:px-3 sm:text-sm"
                />
              </fieldset>
            )}
            {activeTab === "sales" && (
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <span className="text-xs font-medium text-slate-500">
                  Group by
                </span>
                <ToggleGroup
                  type="single"
                  value={groupBy}
                  onValueChange={(value) => {
                    if (value) setGroupBy(value as GroupBy);
                  }}
                  aria-label="Sales grouping period"
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-1"
                >
                  {(["day", "week", "month"] as const).map((period) => (
                    <ToggleGroupItem
                      key={period}
                      value={period}
                      aria-label={`By ${period}`}
                      className="h-8 rounded-lg px-3 text-xs capitalize data-[state=on]:bg-teal-700 data-[state=on]:text-white data-[state=on]:shadow-sm"
                    >
                      By {period}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </div>
        </div>

        {/* ─── Sales ─── */}
        <TabsContent value="sales" className="space-y-5">
          {summary.isLoading || !summary.data ? (
            <Skeleton className="h-96" />
          ) : (
            <>
              <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-3">
                <Card className="min-h-[148px] rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Total Sales
                    </CardTitle>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <BarChart3 className="h-[18px] w-[18px]" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">
                      {summary.data.totalSales}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">transactions</p>
                  </CardContent>
                </Card>
                <Card className="min-h-[148px] rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Revenue
                    </CardTitle>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <CircleDollarSign className="h-[18px] w-[18px]" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">
                      {peso(summary.data.grandTotal)}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">gross total</p>
                  </CardContent>
                </Card>
                <Card className="min-h-[148px] rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Average Sale
                    </CardTitle>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <ShoppingCart className="h-[18px] w-[18px]" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">
                      {peso(
                        summary.data.totalSales > 0
                          ? summary.data.grandTotal / summary.data.totalSales
                          : 0,
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      per transaction
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2 sm:p-6 sm:pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Sales Over Time
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Gross revenue by {groupBy}
                    </p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
                    Gross revenue
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 p-3 pt-4 sm:p-6 sm:pt-4">
                  {chartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No sales data in this range.
                    </p>
                  ) : (
                    <div className="h-[280px] min-w-0 w-full sm:h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E5E7EB"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                          stroke="#9CA3AF"
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                          width={76}
                          tickFormatter={(value: number) =>
                            `₱${value.toLocaleString("en-PH")}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            borderRadius: 14,
                            boxShadow: "0 12px 32px -16px rgba(15, 23, 42, .25)",
                            fontSize: 13,
                          }}
                          formatter={(value: unknown) =>
                            Number(value ?? 0) === 0
                              ? ["No sales recorded", "Gross revenue"]
                              : [peso(Number(value ?? 0)), "Gross revenue"]
                          }
                          cursor={{ fill: "#F0FDFA" }}
                        />
                        <Bar
                          dataKey="total"
                          fill="#0D9488"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                          minPointSize={3}
                        >
                          {chartData.map((row) => (
                            <Cell
                              key={row.period}
                              fill={row.isCurrentPeriod ? "#0F766E" : "#0D9488"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.data.rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No data in this range.
                        </TableCell>
                      </TableRow>
                    )}
                    {summary.data.rows.map((r) => (
                      <TableRow key={r.period}>
                        <TableCell className="font-medium">
                          {r.period}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.salesCount}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {peso(r.subtotal)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {peso(r.discount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {peso(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Profit & Loss ─── */}
        <TabsContent value="pl" className="space-y-4">
          {pl.isLoading || !pl.data ? (
            <Skeleton className="h-64" />
          ) : (
            <>
              <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {peso(pl.data.revenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Subtotal − discount
                    </p>
                  </CardContent>
                </Card>
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">COGS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {peso(pl.data.cogs)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cost of goods sold
                    </p>
                  </CardContent>
                </Card>
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Gross Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${pl.data.grossProfit >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {peso(pl.data.grossProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Margin {pl.data.grossMargin}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {pl.data.netProfit >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${pl.data.netProfit >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {peso(pl.data.netProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Margin {pl.data.netMargin}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className="card-soft">
                <CardHeader>
                  <CardTitle>Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium">{peso(pl.data.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      − Cost of goods sold
                    </span>
                    <span className="font-medium">{peso(pl.data.cogs)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Gross profit</span>
                    <span className="font-medium">
                      {peso(pl.data.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      − Operating expenses
                    </span>
                    <span className="font-medium">
                      {peso(pl.data.expenses)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span className="font-bold">Net profit</span>
                    <span
                      className={`font-bold ${pl.data.netProfit >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {peso(pl.data.netProfit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Inventory ─── */}
        <TabsContent value="inventory" className="space-y-4">
          {valuation.isLoading || !valuation.data ? (
            <Skeleton className="h-64" />
          ) : (
            <>
              <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-3">
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Total Units
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {valuation.data.totalUnits}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {valuation.data.itemCount} SKUs
                    </p>
                  </CardContent>
                </Card>
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cost Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {peso(valuation.data.totalCostValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">at cost</p>
                  </CardContent>
                </Card>
                <Card className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Retail Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {peso(valuation.data.totalRetailValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Potential profit {peso(valuation.data.potentialProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="max-h-96 min-w-0 overflow-auto rounded-xl border border-slate-200 bg-white">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Cost Value</TableHead>
                      <TableHead className="text-right">Retail Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuation.data.items.map((i) => (
                      <TableRow key={i.productId}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {i.sku}
                        </TableCell>
                        <TableCell className="text-right">{i.stock}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {peso(i.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {peso(i.costValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {peso(i.retailValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Top Products ─── */}
        <TabsContent value="top" className="space-y-4">
          {top.isLoading || !top.data ? (
            <Skeleton className="h-64" />
          ) : top.data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No sales data yet.
            </p>
          ) : (
            <>
              <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0 p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="h-[320px] min-w-0 w-full sm:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top.data.rows} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        tickFormatter={(v) => `₱${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        width={88}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(value: unknown) => [
                          peso(Number(value ?? 0)),
                          "Revenue",
                        ]}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#0D9488"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                </CardContent>
              </Card>

              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top.data.rows.map((r, idx) => (
                      <TableRow key={r.productId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {idx === 0 && (
                              <Award className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-muted-foreground">
                              {idx + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.sku}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.unitsSold}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {peso(r.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
