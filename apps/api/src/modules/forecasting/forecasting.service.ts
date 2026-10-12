import { prisma } from "../../lib/prisma";

// ─── Configuration ───
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 30; // "current" period for velocity
const PRIOR_WINDOW_DAYS = 60; // total lookback (recent + prior)
const PATTERN_WINDOW_DAYS = 60; // day-of-week pattern lookback
const DEFAULT_LEAD_TIME_DAYS = 7; // assumption: supplier takes ~1 week
const SAFETY_STOCK_DAYS = 5; // buffer on top of lead time
const TARGET_STOCK_DAYS = 30; // suggested order targets ~1 month
const TREND_MIN_PRIOR_UNITS = 5; // don't compute trend without enough history
const REORDER_ALERT_LIMIT = 15;
const LIST_LIMIT = 10;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type VelocityClass = "FAST" | "MEDIUM" | "SLOW" | "DEAD";
export type TrendDirection = "up" | "down" | "flat";
export type AlertUrgency = "CRITICAL" | "WARNING" | "WATCH";

interface ProductSalesRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  cost: string;
  price: string;
  recentUnits: number;
  priorUnits: number;
}

interface DowRow {
  dow: number;
  units: number;
  revenue: string;
}

interface ForecastItem {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  cost: number;
  price: number;
  stockValue: number;
  recentUnits: number;
  priorUnits: number;
  dailyVelocity: number;
  daysRemaining: number | null;
  stockoutDate: string | null;
  reorderPoint: number;
  suggestedOrderQty: number;
  velocityClass: VelocityClass;
  trend: number | null;
  trendDirection: TrendDirection;
}

interface ReorderAlert extends ForecastItem {
  urgency: AlertUrgency;
}

interface DailyPattern {
  day: string;
  units: number;
  revenue: number;
}

export interface ForecastingInsights {
  generatedAt: string;
  windowDays: number;
  leadTimeDays: number;
  safetyStockDays: number;
  summary: {
    totalProducts: number;
    activeProducts: number;
    deadProducts: number;
    totalStockValue: number;
    willRunOutSoonCount: number;
  };
  reorderAlerts: ReorderAlert[];
  fastMovers: ForecastItem[];
  slowMovers: ForecastItem[];
  deadStock: ForecastItem[];
  patterns: {
    busiestDay: string | null;
    busiestDayMultiplier: number;
    slowestDay: string | null;
    dailyBreakdown: DailyPattern[];
  };
}

// ─── Utilities ───
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function startOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

// ─── Data access ───
async function fetchProductSales(
  businessId: string,
  branchId: string,
  now: Date,
): Promise<ProductSalesRow[]> {
  const recentStart = new Date(now.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);
  const priorStart = new Date(now.getTime() - PRIOR_WINDOW_DAYS * MS_PER_DAY);

  return prisma.$queryRaw<ProductSalesRow[]>`
    SELECT
      p.id,
      p.name,
      p.sku,
      COALESCE(i.stock, 0)::int AS stock,
      p.cost::text  AS cost,
      p.price::text AS price,
      COALESCE(
        SUM(CASE WHEN s."paidAt" >= ${recentStart} THEN si.quantity ELSE 0 END),
        0
      )::int AS "recentUnits",
      COALESCE(
        SUM(CASE
          WHEN s."paidAt" >= ${priorStart} AND s."paidAt" < ${recentStart}
          THEN si.quantity ELSE 0
        END),
        0
      )::int AS "priorUnits"
    FROM "Product" p
    LEFT JOIN "BranchInventory" i
      ON i."productId" = p.id AND i."branchId" = ${branchId}
    LEFT JOIN "SaleItem" si ON si."productId" = p.id
    LEFT JOIN "Sale" s
      ON s.id = si."saleId"
      AND s."deletedAt" IS NULL
    WHERE p."businessId"::text = ${businessId}
      AND p."deletedAt" IS NULL
      AND p.status = 'ACTIVE'
    GROUP BY p.id, p.name, p.sku, i.stock, p.cost, p.price
    ORDER BY p.name ASC
  `;
}

async function fetchDayOfWeekPattern(
  businessId: string,
  branchId: string,
  now: Date,
): Promise<DowRow[]> {
  const since = new Date(now.getTime() - PATTERN_WINDOW_DAYS * MS_PER_DAY);

  return prisma.$queryRaw<DowRow[]>`
    SELECT
      EXTRACT(DOW FROM s."paidAt")::int AS dow,
      COALESCE(SUM(si.quantity), 0)::int AS units,
      COALESCE(SUM(si."lineTotal"), 0)::text AS revenue
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."businessId"::text = ${businessId}
      AND s."branchId"::text = ${branchId}
      AND s."deletedAt" IS NULL
      AND s."paidAt" >= ${since}
    GROUP BY EXTRACT(DOW FROM s."paidAt")
    ORDER BY dow ASC
  `;
}

// ─── Computation ───
function computeTrend(
  recentUnits: number,
  priorUnits: number,
): { trend: number | null; trendDirection: TrendDirection } {
  if (priorUnits < TREND_MIN_PRIOR_UNITS) {
    return { trend: null, trendDirection: "flat" };
  }
  const change = ((recentUnits - priorUnits) / priorUnits) * 100;
  const trend = round2(change);
  const trendDirection: TrendDirection =
    trend > 10 ? "up" : trend < -10 ? "down" : "flat";
  return { trend, trendDirection };
}

function classifyVelocity(items: ForecastItem[]): void {
  const activeVelocities = items
    .filter((i) => i.recentUnits > 0)
    .map((i) => i.dailyVelocity)
    .sort((a, b) => a - b);

  if (activeVelocities.length === 0) {
    for (const item of items) item.velocityClass = "DEAD";
    return;
  }

  const p60Index = Math.floor(activeVelocities.length * 0.6);
  const p85Index = Math.floor(activeVelocities.length * 0.85);
  const p60 =
    activeVelocities[p60Index] ?? activeVelocities[activeVelocities.length - 1];
  const p85 =
    activeVelocities[p85Index] ?? activeVelocities[activeVelocities.length - 1];

  for (const item of items) {
    if (item.recentUnits === 0) {
      item.velocityClass = "DEAD";
    } else if (item.dailyVelocity >= p85) {
      item.velocityClass = "FAST";
    } else if (item.dailyVelocity >= p60) {
      item.velocityClass = "MEDIUM";
    } else {
      item.velocityClass = "SLOW";
    }
  }
}

function alertUrgency(daysRemaining: number | null): AlertUrgency {
  if (daysRemaining === null) return "WATCH";
  if (daysRemaining <= 3) return "CRITICAL";
  if (daysRemaining <= 7) return "WARNING";
  return "WATCH";
}

function buildForecastItem(row: ProductSalesRow, now: Date): ForecastItem {
  const cost = Number(row.cost);
  const price = Number(row.price);
  const stock = row.stock;
  const recentUnits = row.recentUnits;
  const priorUnits = row.priorUnits;

  const dailyVelocity = recentUnits / RECENT_WINDOW_DAYS;

  const daysRemaining =
    dailyVelocity > 0 ? Math.max(0, Math.floor(stock / dailyVelocity)) : null;

  const stockoutDate =
    daysRemaining !== null && daysRemaining > 0
      ? startOfUTCDay(
          new Date(now.getTime() + daysRemaining * MS_PER_DAY),
        ).toISOString()
      : null;

  const reorderPoint = Math.ceil(
    dailyVelocity * (DEFAULT_LEAD_TIME_DAYS + SAFETY_STOCK_DAYS),
  );

  const targetStock = Math.ceil(dailyVelocity * TARGET_STOCK_DAYS);
  const suggestedOrderQty = Math.max(0, targetStock - stock);

  const { trend, trendDirection } = computeTrend(recentUnits, priorUnits);

  return {
    productId: row.id,
    name: row.name,
    sku: row.sku,
    stock,
    cost: round2(cost),
    price: round2(price),
    stockValue: round2(stock * cost),
    recentUnits,
    priorUnits,
    dailyVelocity: round2(dailyVelocity),
    daysRemaining,
    stockoutDate,
    reorderPoint,
    suggestedOrderQty,
    velocityClass: "SLOW", // assigned by classifyVelocity
    trend,
    trendDirection,
  };
}

function buildPatterns(rows: DowRow[]): ForecastingInsights["patterns"] {
  const byDow = new Map<number, DowRow>();
  for (const r of rows) byDow.set(r.dow, r);

  const dailyBreakdown: DailyPattern[] = DAY_NAMES.map((name, idx) => {
    const r = byDow.get(idx);
    return {
      day: name,
      units: r?.units ?? 0,
      revenue: round2(Number(r?.revenue ?? 0)),
    };
  });

  const totalUnits = dailyBreakdown.reduce((s, d) => s + d.units, 0);
  if (totalUnits === 0) {
    return {
      busiestDay: null,
      busiestDayMultiplier: 0,
      slowestDay: null,
      dailyBreakdown,
    };
  }

  const avgPerDay = totalUnits / 7;

  const sorted = [...dailyBreakdown].sort((a, b) => b.units - a.units);
  const busiest = sorted[0];
  const slowest = sorted[sorted.length - 1];

  return {
    busiestDay: busiest.units > 0 ? busiest.day : null,
    busiestDayMultiplier:
      avgPerDay > 0 && busiest.units > 0
        ? round1(busiest.units / avgPerDay)
        : 0,
    slowestDay: slowest.units > 0 ? slowest.day : null,
    dailyBreakdown,
  };
}

// ─── Public API ───
export async function getInsights(
  businessId: string,
  branchId: string,
): Promise<ForecastingInsights> {
  const now = new Date();

  const [productRows, dowRows] = await Promise.all([
    fetchProductSales(businessId, branchId, now),
    fetchDayOfWeekPattern(businessId, branchId, now),
  ]);

  const items = productRows.map((row) => buildForecastItem(row, now));
  classifyVelocity(items);

  const activeItems = items.filter((i) => i.recentUnits > 0);
  const deadItems = items.filter((i) => i.recentUnits === 0 && i.stock > 0);

  // Reorder alerts — items that will run out within lead time
  const reorderAlerts: ReorderAlert[] = items
    .filter(
      (i) =>
        i.dailyVelocity > 0 &&
        i.daysRemaining !== null &&
        i.daysRemaining <= DEFAULT_LEAD_TIME_DAYS,
    )
    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
    .slice(0, REORDER_ALERT_LIMIT)
    .map((i) => ({ ...i, urgency: alertUrgency(i.daysRemaining) }));

  // Fast movers — highest velocity, still selling
  const fastMovers = [...activeItems]
    .sort((a, b) => b.dailyVelocity - a.dailyVelocity)
    .slice(0, LIST_LIMIT);

  // Slow movers — low velocity, still selling
  const slowMovers = activeItems
    .filter((i) => i.velocityClass === "SLOW")
    .sort((a, b) => a.dailyVelocity - b.dailyVelocity)
    .slice(0, LIST_LIMIT);

  // Dead stock — no sales in the recent window, still on shelf
  const deadStock = [...deadItems]
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, REORDER_ALERT_LIMIT);

  const totalStockValue = items.reduce((s, i) => s + i.stockValue, 0);

  return {
    generatedAt: now.toISOString(),
    windowDays: RECENT_WINDOW_DAYS,
    leadTimeDays: DEFAULT_LEAD_TIME_DAYS,
    safetyStockDays: SAFETY_STOCK_DAYS,
    summary: {
      totalProducts: items.length,
      activeProducts: activeItems.length,
      deadProducts: deadItems.length,
      totalStockValue: round2(totalStockValue),
      willRunOutSoonCount: reorderAlerts.length,
    },
    reorderAlerts,
    fastMovers,
    slowMovers,
    deadStock,
    patterns: buildPatterns(dowRows),
  };
}
