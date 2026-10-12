import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import {
  filterOfflineCustomers,
  filterOfflineProducts,
  readCatalog,
  saveCatalog,
} from "@/lib/offline-store";
import type { Product } from "@/features/products/use-products";

export type PaymentMethod = "CASH" | "GCASH" | "MAYA";

export interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export interface SaleItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Sale {
  id: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountTendered: string | null;
  changeDue: string | null;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paidAt: string;
  items: SaleItem[];
  customer?: { id: string; name: string } | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  deletedAt?: string | null;
}

export interface CheckoutInput {
  items: { productId: string; quantity: number }[];
  expectedPrices?: { productId: string; unitPrice: number }[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  paymentReference?: string;
}

export function useProductSearch(search: string, categoryId?: string) {
  const user = useAuth((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  return useQuery({
    queryKey: [
      "pos",
      "products",
      user?.id ?? "anonymous",
      branchId ?? "no-branch",
      search,
      categoryId ?? "all",
    ],
    queryFn: async () => {
      if (!user || !branchId) {
        throw new Error("Select a branch to load products");
      }
      const scope = {
        userId: user.id,
        businessId: user.businessId,
        branchId,
      };
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      try {
        const res = await api.get<{ items: Product[] }>(
          `/products?${params.toString()}`,
        );
        await saveCatalog(scope, "products", res.data.items);
        return res.data.items.filter((product) => product.status === "ACTIVE");
      } catch (error) {
        if (navigator.onLine) throw error;
        const cached = await readCatalog<Product>(scope, "products");
        return filterOfflineProducts(cached, search, categoryId);
      }
    },
    staleTime: 0,
  });
}

export function useCustomerSearch(search: string) {
  const user = useAuth((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  return useQuery({
    queryKey: [
      "pos",
      "customers",
      user?.id ?? "anonymous",
      branchId ?? "no-branch",
      search,
    ],
    queryFn: async () => {
      if (!user || !branchId) {
        throw new Error("Select a branch to load customers");
      }
      const scope = {
        userId: user.id,
        businessId: user.businessId,
        branchId,
      };
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      try {
        const res = await api.get<{ items: Customer[] }>(
          `/customers?${params.toString()}`,
        );
        await saveCatalog(scope, "customers", res.data.items);
        return res.data.items;
      } catch (error) {
        if (navigator.onLine) throw error;
        return filterOfflineCustomers(
          await readCatalog<Customer>(scope, "customers"),
          search,
        );
      }
    },
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      idempotencyKey,
    }: {
      input: CheckoutInput;
      idempotencyKey: string;
    }) => {
      const res = await api.post<Sale>("/pos/checkout", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["pos", "products"] });
    },
  });
}
