import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import type { Product } from "@/features/products/use-products";

export interface LowStockResponse {
  items: Product[];
  threshold: number;
}

export interface AdjustInput {
  productId: string;
  delta: number;
  reason: string;
}

export interface StockInInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface StockOutInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface AdjustResult {
  product: Product;
  previous: number;
  delta: number;
}

export function useLowStock(threshold = 5) {
  const userId = useAuth((state) => state.user?.id);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  return useQuery({
    queryKey: [
      "inventory",
      "low-stock",
      userId ?? "anonymous",
      branchId ?? "no-branch",
      threshold,
    ],
    queryFn: async () =>
      (
        await api.get<LowStockResponse>(
          `/inventory/low-stock?threshold=${threshold}`,
        )
      ).data,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useProductsForInventory(search: string, categoryId?: string) {
  const userId = useAuth((state) => state.user?.id);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  return useQuery({
    queryKey: [
      "inventory",
      "products",
      userId ?? "anonymous",
      branchId ?? "no-branch",
      search,
      categoryId ?? "all",
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await api.get<{ items: Product[] }>(
        `/products?${params.toString()}`,
      );
      return res.data.items;
    },
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["inventory"] });
  qc.invalidateQueries({ queryKey: ["products"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjustInput) =>
      (await api.post<AdjustResult>("/inventory/adjust", input)).data,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockInInput) =>
      (await api.post<AdjustResult>("/inventory/stock-in", input)).data,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useStockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOutInput) =>
      (await api.post<AdjustResult>("/inventory/stock-out", input)).data,
    onSuccess: () => invalidateAll(qc),
  });
}
