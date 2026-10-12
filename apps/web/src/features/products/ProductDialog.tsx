import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useCategories } from "@/features/categories/use-categories";
import {
  Product,
  ProductInput,
  ProductStatus,
  useCreateProduct,
  useUpdateProduct,
} from "./use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product | null;
}

const empty: ProductInput = {
  name: "",
  sku: "",
  categoryId: null,
  price: 0,
  cost: 0,
  stock: 0,
  status: "ACTIVE",
};

const NO_CATEGORY = "__none__";

export function ProductDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductInput>(empty);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories();

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId ?? null,
        price: Number(product.price),
        cost: Number(product.cost),
        stock: product.stock,
        status: product.status,
      });
    } else {
      setForm(empty);
    }
  }, [open, product]);

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: ProductInput = {
        ...form,
        categoryId: form.categoryId ?? null,
      };
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, ...payload });
        toast.success("Product updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Product created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the product details."
              : "Add a new product to your catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId ?? NO_CATEGORY}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    categoryId: v === NO_CATEGORY ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
                  {loadingCategories ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Loading...
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No categories yet
                    </div>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Selling price (₱)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₱)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={form.cost || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cost: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={form.stock || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as ProductStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
