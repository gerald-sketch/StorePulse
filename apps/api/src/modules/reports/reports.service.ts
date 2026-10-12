import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BUSINESS_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

export type GroupBy = "day" | "week" | "month";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function startOfBusinessDay(d: Date): Date {
  const x = new Date(d.getTime() + BUSINESS_UTC_OFFSET_MS);
  x.setUTCHours(0, 0, 0, 0);
  return new Date(x.getTime() - BUSINESS_UTC_OFFSET_MS);
}

export function resolveRange(from?: Date, to?: Date): { from: Date; to: Date } {
  const now = new Date();
  const end = to ?? now;
  const start =
    from ?? startOfBusinessDay(new Date(end.getTime() - 29 * MS_PER_DAY));
  if (start > end) {
    throw new AppError(400, "INVALID_RANGE", "from must be before to");
  }
  return { from: start, to: end };
}

// ─── Sales summary ─────────────────────────────────────
export async function salesSummary(
  businessId: string,
  branchId: string,
  from: Date,
  to: Date,
  groupBy: GroupBy,
) {
  const rows = await prisma.$queryRaw<
    Array<{
      period: string;
      salesCount: number;
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
    }>
  >`
    WITH bucketed AS (
      SELECT
        DATE_TRUNC(
          ${groupBy}::text,
          "paidAt" + INTERVAL '8 hours'
        ) AS bucket,
        "subtotal",
        "discount",
        "tax",
        "total"
      FROM "Sale"
      WHERE "businessId" = ${businessId}
        AND "branchId" = ${branchId}
        AND "paidAt" >= ${from}
        AND "paidAt" < ${to}
        AND "deletedAt" IS NULL
    )
    SELECT
      TO_CHAR(bucket, 'YYYY-MM-DD') AS period,
      COUNT(*)::int AS "salesCount",
      COALESCE(SUM("subtotal"), 0)::text AS subtotal,
      COALESCE(SUM("discount"), 0)::text AS discount,
      COALESCE(SUM("tax"), 0)::text AS tax,
      COALESCE(SUM("total"), 0)::text AS total
    FROM bucketed
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const mapped = rows.map((r) => ({
    period: r.period,
    salesCount: r.salesCount,
    subtotal: round2(Number(r.subtotal)),
    discount: round2(Number(r.discount)),
    tax: round2(Number(r.tax)),
    total: round2(Number(r.total)),
  }));

  const dailyRows =
    groupBy === "day" && to > from
      ? (() => {
          const rowsByDay = new Map(mapped.map((row) => [row.period, row]));
          const firstDay = startOfBusinessDay(from);
          const lastDay = startOfBusinessDay(new Date(to.getTime() - 1));
          const days =
            Math.floor((lastDay.getTime() - firstDay.getTime()) / MS_PER_DAY) +
            1;

          return Array.from({ length: days }, (_, index) => {
            const day = new Date(
              firstDay.getTime() + index * MS_PER_DAY + BUSINESS_UTC_OFFSET_MS,
            )
              .toISOString()
              .slice(0, 10);
            return (
              rowsByDay.get(day) ?? {
                period: day,
                salesCount: 0,
                subtotal: 0,
                discount: 0,
                tax: 0,
                total: 0,
              }
            );
          });
        })()
      : mapped;

  const grandTotal = dailyRows.reduce((s, r) => s + r.total, 0);
  const totalSales = dailyRows.reduce((s, r) => s + r.salesCount, 0);

  return {
    from,
    to,
    groupBy,
    totalSales,
    grandTotal: round2(grandTotal),
    rows: dailyRows,
  };
}
// ─── Profit & Loss ─────────────────────────────────────
export async function profitLoss(
  businessId: string,
  branchId: string,
  from: Date,
  to: Date,
) {
  const [revRow] = await prisma.$queryRaw<Array<{ revenue: string }>>`
    SELECT COALESCE(SUM("subtotal" - "discount"), 0)::text AS revenue
    FROM "Sale"
    WHERE "businessId" = ${businessId}
      AND "branchId" = ${branchId}
      AND "paidAt" >= ${from}
      AND "paidAt" < ${to}
      AND "deletedAt" IS NULL
  `;

  const [cogsRow] = await prisma.$queryRaw<Array<{ cogs: string }>>`
    SELECT COALESCE(SUM(si.quantity * p.cost), 0)::text AS cogs
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    JOIN "Product" p ON p.id = si."productId"
    WHERE s."businessId" = ${businessId}
      AND s."branchId" = ${branchId}
      AND s."paidAt" >= ${from}
      AND s."paidAt" < ${to}
      AND s."deletedAt" IS NULL
  `;

  const [expRow] = await prisma.$queryRaw<Array<{ expenses: string }>>`
    SELECT COALESCE(SUM(amount), 0)::text AS expenses
    FROM "Expense"
    WHERE "businessId" = ${businessId}
      AND "branchId" = ${branchId}
      AND "spentAt" >= ${from}
      AND "spentAt" < ${to}
      AND "deletedAt" IS NULL
  `;

  const revenue = Number(revRow?.revenue ?? 0);
  const cogs = Number(cogsRow?.cogs ?? 0);
  const expenses = Number(expRow?.expenses ?? 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  return {
    from,
    to,
    revenue: round2(revenue),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    grossMargin: revenue > 0 ? round2((grossProfit / revenue) * 100) : 0,
    expenses: round2(expenses),
    netProfit: round2(netProfit),
    netMargin: revenue > 0 ? round2((netProfit / revenue) * 100) : 0,
  };
}

// ─── Inventory valuation ───────────────────────────────
export async function inventoryValuation(businessId: string, branchId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      cost: string;
      price: string;
      costValue: string;
      retailValue: string;
    }>
  >`
    SELECT
      p.id, p.name, p.sku, i.stock,
      p.cost::text AS cost,
      p.price::text AS price,
      (i.stock * p.cost)::text AS "costValue",
      (i.stock * p.price)::text AS "retailValue"
    FROM "Product" p
    JOIN "BranchInventory" i ON i."productId" = p.id
    WHERE p."businessId" = ${businessId}
      AND i."branchId" = ${branchId}
      AND p."deletedAt" IS NULL
    ORDER BY p.name ASC
  `;

  const items = rows.map((r) => ({
    productId: r.id,
    name: r.name,
    sku: r.sku,
    stock: r.stock,
    cost: round2(Number(r.cost)),
    price: round2(Number(r.price)),
    costValue: round2(Number(r.costValue)),
    retailValue: round2(Number(r.retailValue)),
  }));

  const totalCostValue = round2(items.reduce((s, r) => s + r.costValue, 0));
  const totalRetailValue = round2(items.reduce((s, r) => s + r.retailValue, 0));
  const totalUnits = items.reduce((s, r) => s + r.stock, 0);

  return {
    totalUnits,
    totalCostValue,
    totalRetailValue,
    potentialProfit: round2(totalRetailValue - totalCostValue),
    itemCount: items.length,
    items,
  };
}

// ─── Top products ──────────────────────────────────────
export async function topProducts(
  businessId: string,
  branchId: string,
  from: Date,
  to: Date,
  limit: number,
) {
  const rows = await prisma.$queryRaw<
    Array<{
      productId: string;
      name: string;
      sku: string;
      unitsSold: number;
      revenue: string;
    }>
  >`
    SELECT
      si."productId",
      si.name,
      si.sku,
      SUM(si.quantity)::int AS "unitsSold",
      SUM(si."lineTotal")::text AS revenue
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."businessId" = ${businessId}
      AND s."branchId" = ${branchId}
      AND s."paidAt" >= ${from}
      AND s."paidAt" < ${to}
      AND s."deletedAt" IS NULL
    GROUP BY si."productId", si.name, si.sku
    ORDER BY SUM(si.quantity) DESC
    LIMIT ${limit}
  `;

  return {
    from,
    to,
    rows: rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      unitsSold: r.unitsSold,
      revenue: round2(Number(r.revenue)),
    })),
  };
}

// ─── CSV export ────────────────────────────────────────
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportSalesCsv(
  businessId: string,
  branchId: string,
  from: Date,
  to: Date,
): Promise<string> {
  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      branchId,
      deletedAt: null,
      paidAt: { gte: from, lt: to },
    },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  const header = [
    "Sale ID",
    "Date",
    "Customer",
    "Cashier",
    "Payment",
    "Subtotal",
    "Discount",
    "Tax",
    "Total",
  ];
  const lines = [header.map(csvEscape).join(",")];

  for (const s of sales) {
    lines.push(
      [
        s.id,
        s.paidAt.toISOString(),
        s.customer?.name ?? "Walk-in",
        s.user?.name ?? "",
        s.paymentMethod,
        s.subtotal.toString(),
        s.discount.toString(),
        s.tax.toString(),
        s.total.toString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return lines.join("\n");
}
