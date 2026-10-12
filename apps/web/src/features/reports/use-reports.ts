import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ReportDateRange {
  from: string;
  to: string;
}

function dateRangeParams(range?: ReportDateRange): string {
  if (!range) return "";
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return `&${params.toString()}`;
}

export interface SalesSummaryRow {
  period: string;
  salesCount: number;
  subtotal: number;
  discount: number;
  total: number;
}

export interface SalesSummaryData {
  rows: SalesSummaryRow[];
  totalSales: number;
  grandTotal: number;
}

export interface ProfitLossData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
}

export interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  cost: number;
  costValue: number;
  retailValue: number;
}

export interface InventoryValuationData {
  itemCount: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  items: InventoryItem[];
}

export interface TopProductRow {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface TopProductsData {
  rows: TopProductRow[];
}

export function useSalesSummary(
  groupBy: "day" | "week" | "month",
  range?: ReportDateRange,
) {
  return useQuery<SalesSummaryData>({
    queryKey: ["reports", "sales-summary", groupBy, range],
    queryFn: async () =>
      (await api.get(
        `/reports/sales-summary?groupBy=${groupBy}${dateRangeParams(range)}`,
      ))
        .data as SalesSummaryData,
  });
}

export function useProfitLoss(range?: ReportDateRange, enabled = true) {
  const params = range
    ? new URLSearchParams({ from: range.from, to: range.to }).toString()
    : "";
  return useQuery<ProfitLossData>({
    queryKey: ["reports", "profit-loss", range],
    queryFn: async () =>
      (await api.get(`/reports/profit-loss${params ? `?${params}` : ""}`)).data as
        ProfitLossData,
    enabled,
  });
}

export function useInventoryValuation(enabled = true) {
  return useQuery<InventoryValuationData>({
    queryKey: ["reports", "inventory-valuation"],
    queryFn: async () =>
      (await api.get("/reports/inventory-valuation"))
        .data as InventoryValuationData,
    enabled,
  });
}

export function useTopProducts(range?: ReportDateRange, enabled = true) {
  const params = range
    ? new URLSearchParams({ from: range.from, to: range.to }).toString()
    : "";
  return useQuery<TopProductsData>({
    queryKey: ["reports", "top-products", range],
    queryFn: async () =>
      (
        await api.get(
          `/reports/top-products?limit=10${params ? `&${params}` : ""}`,
        )
      ).data as TopProductsData,
    enabled,
  });
}
