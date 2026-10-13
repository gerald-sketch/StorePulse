import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export interface PurchaseItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface Purchase {
  id: string;
  reference: string | null;
  status: PurchaseStatus;
  total: string;
  notes: string | null;
  orderedAt: string;
  receivedAt: string | null;
  supplier: { id: string; name: string };
  items: PurchaseItem[];
}

export interface PurchaseInput {
  supplierId: string;
  reference?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}

export function usePurchases(page: number, status?: PurchaseStatus) {
  return useQuery({
    queryKey: ["purchases", { page, status }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      const res = await api.get<{
        items: Purchase[];
        total: number;
        page: number;
        pages: number;
      }>(`/purchases?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PurchaseInput) =>
      (await api.post<Purchase>("/purchases", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
}

export function useReceivePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<Purchase>(`/purchases/${id}/receive`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<Purchase>(`/purchases/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
}
