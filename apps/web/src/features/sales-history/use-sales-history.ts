import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SalesHistory {
  date: string;
  sales: {
    id: string;
    paidAt: string;
    total: number;
    paymentMethod: string;
    customerName: string;
    items: {
      productId: string;
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
  }[];
}

export function useSalesHistory(date: string) {
  return useQuery({
    queryKey: ["sales-history", date],
    queryFn: async () => {
      const params = new URLSearchParams({ date });
      return (
        await api.get<SalesHistory>(`/dashboard/my-sales?${params.toString()}`)
      ).data;
    },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
