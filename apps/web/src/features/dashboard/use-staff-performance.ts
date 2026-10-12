import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface StaffSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  salesCount: number;
  revenue: number;
  avgSale: number;
  todayCount: number;
  todayRevenue: number;
  mtdCount: number;
  mtdRevenue: number;
  lastSaleAt: string | null;
}

export interface StaffDetail {
  staff: StaffSummary & {
    joinedAt: string;
  };
  daily14d: { day: string; total: number; count: number }[];
  topProducts: {
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }[];
  recentSales: {
    id: string;
    total: number;
    paymentMethod: string;
    paidAt: string;
    customerName: string;
  }[];
  paymentBreakdown: {
    method: string;
    count: number;
    total: number;
  }[];
}

export interface StaffProductSales {
  days: {
    day: string;
    items: {
      productId: string;
      name: string;
      sku: string;
      unitsSold: number;
      revenue: number;
      salesCount: number;
    }[];
  }[];
}

export function useStaffOverview() {
  return useQuery({
    queryKey: ["dashboard", "staff"],
    queryFn: async () =>
      (
        await api.get<{ staff: StaffSummary[]; todayRevenue: number }>(
          "/dashboard/staff",
        )
      ).data,
    staleTime: 30_000,
  });
}

export function useStaffDetail(userId: string | null) {
  return useQuery({
    queryKey: ["dashboard", "staff", userId],
    queryFn: async () =>
      (await api.get<StaffDetail>(`/dashboard/staff/${userId}`)).data,
    enabled: !!userId,
  });
}

export function useStaffProductSales(
  userId: string | null,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ["dashboard", "staff", userId, "product-sales", { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      return (
        await api.get<StaffProductSales>(
          `/dashboard/staff/${userId}/product-sales?${params.toString()}`,
        )
      ).data;
    },
    enabled: !!userId && !!from && !!to && from <= to,
  });
}
