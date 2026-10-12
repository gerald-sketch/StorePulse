import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Tags } from "lucide-react";
import { useProducts, useDeleteProduct, Product } from "./use-products";
import { ProductDialog } from "./ProductDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManageCategoriesDialog } from "@/features/categories/ManageCategoriesDialog";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function peso(n: number | string) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { data, isLoading } = useProducts(page, search);
  const del = useDeleteProduct();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success("Product deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your catalog">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            onClick={() => setCategoriesOpen(true)}
            className="w-full rounded-xl sm:w-auto"
          >
            <Tags className="h-4 w-4 mr-2" />
            Categories
          </Button>
          <Button onClick={openCreate} className="w-full rounded-xl sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New product
          </Button>
        </div>
      </PageHeader>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          className="pl-9"
          aria-label="Search products by name or SKU"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {data?.items.length === 0 && (
              <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                {search
                  ? "No products match your search."
                  : 'No products yet. Tap "New product" to add one.'}
              </p>
            )}
            {data?.items.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        SKU: {p.sku}
                      </p>
                      {p.category && (
                        <Badge
                          variant="outline"
                          className="mt-2 max-w-full truncate border-border/60 text-xs"
                        >
                          {p.category.name}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={p.status === "ACTIVE" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {p.status === "ACTIVE" ? "Active" : "Discontinued"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Price</p>
                      <p className="truncate text-sm font-semibold">
                        {peso(p.price)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Cost</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {peso(p.cost)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Stock</p>
                      <p
                        className={`text-sm ${
                          p.stock <= 5
                            ? "font-medium text-destructive"
                            : "font-medium"
                        }`}
                      >
                        {p.stock}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-1 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-10 px-3"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-10 px-3 text-destructive hover:text-destructive"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      No products yet. Click "New product" to add one.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.sku}
                    </TableCell>
                    <TableCell>
                      {p.category ? (
                        <Badge
                          variant="outline"
                          className="border-border/60 text-xs"
                        >
                          {p.category.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {peso(p.price)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {peso(p.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          p.stock <= 5 ? "text-destructive font-medium" : ""
                        }
                      >
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {p.status === "ACTIVE" ? "Active" : "Discontinued"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Page {data.page} of {data.pages} · {data.total} total
              </span>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
      />

      <ManageCategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              "{deleting?.name}" will be hidden from your catalog. This can't be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              {del.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
