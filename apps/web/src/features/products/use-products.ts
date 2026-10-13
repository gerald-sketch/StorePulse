import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ProductStatus = "ACTIVE" | "DISCONTINUED";

export interface Product {
  id: string;
  businessId: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ProductList {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductInput {
  name: string;
  sku: string;
  categoryId?: string | null;
  price: number;
  cost: number;
  stock: number;
  status: ProductStatus;
}

export function useProducts(page: number, search: string, categoryId?: string) {
  return useQuery({
    queryKey: ["products", { page, search, categoryId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await api.get<ProductList>(`/products?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const res = await api.post<Product>("/products", input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<ProductInput> & { id: string }) => {
      const res = await api.patch<Product>(`/products/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
