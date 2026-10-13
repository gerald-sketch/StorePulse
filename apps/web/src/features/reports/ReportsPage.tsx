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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
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

function formatReportDate(period: string, groupBy: GroupBy) {
  if (groupBy === "month") {
    const [year, month] = period.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const date = new Date(`${period}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [salesSearch, setSalesSearch] = useState("");
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
          ? formatReportDate(r.period, groupBy)
          : groupBy === "week"
            ? `Week of ${new Date(`${r.period}T00:00:00.000Z`).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", timeZone: "UTC" },
              )}`
            : new Date(`${r.period}T00:00:00.000Z`).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", timeZone: "UTC" },
              ),
      total: r.total,
      subtotal: r.subtotal,
      discount: r.discount,
      isCurrentPeriod,
    };
  });
  const visibleSalesRows = (summary.data?.rows ?? []).filter((row) =>
    formatReportDate(row.period, groupBy)
      .toLocaleLowerCase()
      .includes(salesSearch.trim().toLocaleLowerCase()),
  );
  const salesTotals = visibleSalesRows.reduce(
    (totals, row) => ({
      salesCount: totals.salesCount + row.salesCount,
      subtotal: totals.subtotal + row.subtotal,
      discount: totals.discount + row.discount,
      total: totals.total + row.total,
    }),
    { salesCount: 0, subtotal: 0, discount: 0, total: 0 },
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Reports
          </h1>
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
              <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
                <label
                  htmlFor="reports-group-by"
                  className="shrink-0 text-xs font-medium text-slate-500"
                >
                  Group by
                </label>
                <Select
                  value={groupBy}
                  onValueChange={(value) => {
                    if (value === "day" || value === "week" || value === "month") {
                      setGroupBy(value);
                    }
                  }}
                >
                  <SelectTrigger
                    id="reports-group-by"
                    className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm sm:w-36"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
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
                      Total Transactions
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
                      Gross Revenue
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
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                    Gross Revenue
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
                          tick={{ fontSize: 11, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                          stroke="#9CA3AF"
                          interval="preserveStart"
                          minTickGap={16}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                          width={76}
                          tickFormatter={(value: number) =>
                            `₱${value.toLocaleString("en-PH", {
                              notation: value >= 100000 ? "compact" : "standard",
                              maximumFractionDigits: 1,
                            })}`
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
                          fill="#0F766E"
                          radius={[8, 8, 0, 0]}
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

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Daily Breakdown
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Transactions and revenue for the selected range
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      value={salesSearch}
                      onChange={(event) => setSalesSearch(event.target.value)}
                      placeholder="Search date..."
                      aria-label="Search daily breakdown dates"
                      className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader className="sticky top-0 z-10 bg-slate-50">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="bg-slate-50">Date</TableHead>
                        <TableHead className="bg-slate-50 text-right">Sales</TableHead>
                        <TableHead className="bg-slate-50 text-right">Subtotal</TableHead>
                        <TableHead className="bg-slate-50 text-right">Discount</TableHead>
                        <TableHead className="bg-slate-50 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleSalesRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            {salesSearch.trim()
                              ? "No dates match your search."
                              : "No data in this range."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        visibleSalesRows.map((row, index) => (
                          <TableRow
                            key={row.period}
                            className={cn(
                              "transition-colors hover:bg-teal-50/60",
                              index % 2 === 1 && "bg-slate-50/60",
                            )}
                          >
                            <TableCell className="font-medium text-slate-800">
                              {formatReportDate(row.period, groupBy)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.salesCount}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-slate-600">
                              {peso(row.subtotal)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-slate-600">
                              {peso(row.discount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                              {peso(row.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {visibleSalesRows.length > 0 && (
                      <tfoot className="sticky bottom-0 z-10 bg-teal-50">
                        <TableRow className="border-t-2 border-teal-100 hover:bg-teal-50">
                          <TableCell className="font-bold text-slate-900">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {salesTotals.salesCount}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {peso(salesTotals.subtotal)}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {peso(salesTotals.discount)}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums text-teal-800">
                            {peso(salesTotals.total)}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    )}
                  </Table>
                </div>
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
