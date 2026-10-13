import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  LayoutGrid,
  X,
  ArrowUpDown,
  Plus,
  Ban,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { useLowStock, useProductsForInventory } from "./use-inventory";
import { StockDialog } from "./StockDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCategories } from "@/features/categories/use-categories";
import { useAuth } from "@/lib/auth-store";
import type { Product } from "@/features/products/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pesoCompact(n: number) {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

// ─── Stock classification ───
type StockLevel = "OUT" | "CRITICAL" | "LOW" | "OK" | "HEALTHY";

function classifyStock(stock: number): StockLevel {
  if (stock === 0) return "OUT";
  if (stock <= 5) return "CRITICAL";
  if (stock <= 15) return "LOW";
  if (stock <= 50) return "OK";
  return "HEALTHY";
}

const STOCK_META: Record<
  StockLevel,
  {
    label: string;
    bar: string;
    text: string;
    badge: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  OUT: {
    label: "Out of stock",
    bar: "bg-destructive",
    text: "text-destructive",
    badge: "destructive",
  },
  CRITICAL: {
    label: "Critical",
    bar: "bg-destructive",
    text: "text-destructive",
    badge: "destructive",
  },
  LOW: {
    label: "Low",
    bar: "bg-amber-500",
    text: "text-amber-600",
    badge: "secondary",
  },
  OK: {
    label: "In stock",
    bar: "bg-primary/60",
    text: "text-foreground",
    badge: "outline",
  },
  HEALTHY: {
    label: "Healthy",
    bar: "bg-primary",
    text: "text-primary",
    badge: "outline",
  },
};

function stockPercent(stock: number): number {
  return Math.min(100, Math.max(2, (stock / 100) * 100));
}

// ─── Stat card ───
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Package;
  tone?: "default" | "warning" | "danger" | "primary";
}) {
  const tones = {
    default: { bg: "bg-muted/50", fg: "text-muted-foreground" },
    warning: { bg: "bg-amber-500/10", fg: "text-amber-600" },
    danger: { bg: "bg-destructive/10", fg: "text-destructive" },
    primary: { bg: "bg-primary/10", fg: "text-primary" },
  };
  const t = tones[tone];

  return (
    <Card className="card-soft">
      <CardContent className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-[13px] text-muted-foreground font-medium leading-tight">
            {label}
          </span>
          <div
            className={cn(
              "h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0",
              t.bg,
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", t.fg)} />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Sort options ───
type SortKey = "name" | "stock-asc" | "stock-desc" | "value-desc";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name (A–Z)",
  "stock-asc": "Stock (low to high)",
  "stock-desc": "Stock (high to low)",
  "value-desc": "Value (highest)",
};

type StatusFilter = "ALL" | "LOW" | "OUT";
const LOW_STOCK_THRESHOLD = 15;

// ─── Mobile product card ───
function ProductCard({
  product,
  canAdjust,
  onAdjust,
}: {
  product: Product;
  canAdjust: boolean;
  onAdjust: () => void;
}) {
  const level = classifyStock(product.stock);
  const meta = STOCK_META[level];
  const pct = stockPercent(product.stock);

  return (
    <Card className="card-soft overflow-hidden">
      <CardContent className="p-4">
        {/* Top row: name + status badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[15px] leading-tight truncate">
              {product.name}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
              {product.sku}
            </p>
          </div>
          <Badge
            variant={meta.badge}
            className="text-[10px] font-normal shrink-0"
          >
            {meta.label}
          </Badge>
        </div>

        {/* Category + value row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {product.category ? (
            <Badge
              variant="outline"
              className="border-border/60 text-[10px] font-normal"
            >
              {product.category.name}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Uncategorized
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {peso(product.stock * Number(product.cost))}
          </span>
        </div>

        {/* Stock bar + number */}
        <div className="space-y-2 mb-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Stock
            </span>
            <span className={cn("text-lg font-bold tabular-nums", meta.text)}>
              {product.stock}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", meta.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Bottom row: cost + adjust button */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Cost
            </p>
            <p className="text-sm font-medium tabular-nums">
              {peso(Number(product.cost))}
            </p>
          </div>
          {canAdjust && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={onAdjust}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adjust
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───
export function InventoryPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const canAdjust = user?.role === "OWNER" || user?.role === "MANAGER";

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: allProducts, isLoading } = useProductsForInventory(
    search,
    categoryId ?? undefined,
  );
  const { data: lowStock } = useLowStock(5);

  const stats = useMemo(() => {
    const items = allProducts ?? [];
    const totalUnits = items.reduce((sum, p) => sum + p.stock, 0);
    const costValue = items.reduce(
      (sum, p) => sum + p.stock * Number(p.cost),
      0,
    );
    const retailValue = items.reduce(
      (sum, p) => sum + p.stock * Number(p.price),
      0,
    );
    const outOfStock = items.filter((p) => p.stock === 0).length;
    const lowCount = items.filter(
      (p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
    ).length;

    return {
      totalSkus: items.length,
      totalUnits,
      costValue,
      retailValue,
      potentialProfit: retailValue - costValue,
      outOfStock,
      lowCount,
    };
  }, [allProducts]);

  const visibleProducts = useMemo(() => {
    let items = [...(allProducts ?? [])];

    if (statusFilter === "LOW") {
      items = items.filter(
        (p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
      );
    } else if (statusFilter === "OUT") {
      items = items.filter((p) => p.stock === 0);
    }

    switch (sortKey) {
      case "name":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "stock-asc":
        items.sort((a, b) => a.stock - b.stock);
        break;
      case "stock-desc":
        items.sort((a, b) => b.stock - a.stock);
        break;
      case "value-desc":
        items.sort(
          (a, b) => b.stock * Number(b.cost) - a.stock * Number(a.cost),
        );
        break;
    }

    return items;
  }, [allProducts, statusFilter, sortKey]);

  function openAdjust(product: Product) {
    if (!canAdjust) return;
    setSelected(product);
    setDialogOpen(true);
  }

  const activeFilterCount =
    (categoryId ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (sortKey !== "name" ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ─── Header ─── */}
      <PageHeader
        title="Inventory"
        description="Track stock levels, adjust quantities, monitor value"
      >
        <Button
          variant="outline"
          className="w-full rounded-xl sm:w-auto"
          onClick={() => navigate("/purchases")}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase order
        </Button>
      </PageHeader>

      {/* ─── Summary cards ─── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total SKUs"
          value={stats.totalSkus.toString()}
          sub={`${stats.totalUnits.toLocaleString()} units`}
          icon={Layers}
          tone="primary"
        />
        <StatCard
          label="Stock Value"
          value={pesoCompact(stats.costValue)}
          sub={`${pesoCompact(stats.retailValue)} retail`}
          icon={DollarSign}
        />
        <StatCard
          label="Potential Profit"
          value={pesoCompact(stats.potentialProfit)}
          sub="At retail"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Needs Attention"
          value={(stats.lowCount + stats.outOfStock).toString()}
          sub={
            stats.outOfStock > 0
              ? `${stats.outOfStock} out · ${stats.lowCount} low`
              : `${stats.lowCount} low`
          }
          icon={AlertTriangle}
          tone={stats.lowCount + stats.outOfStock > 0 ? "warning" : "default"}
        />
      </div>

      {/* ─── Low stock banner ─── */}
      {lowStock && lowStock.items.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {lowStock.items.length}{" "}
                {lowStock.items.length === 1 ? "item is" : "items are"} running
                low
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                5 units or fewer on hand
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {lowStock.items.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openAdjust(p)}
                    disabled={!canAdjust}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs transition-colors",
                      canAdjust
                        ? "hover:border-primary/40 hover:bg-muted/50"
                        : "cursor-default",
                    )}
                  >
                    <span className="truncate max-w-[100px]">{p.name}</span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        p.stock === 0 ? "text-destructive" : "text-amber-600",
                      )}
                    >
                      {p.stock}
                    </span>
                  </button>
                ))}
                {lowStock.items.length > 4 && (
                  <button
                    onClick={() => setStatusFilter("LOW")}
                    className="text-xs text-muted-foreground hover:text-primary px-2 py-1"
                  >
                    +{lowStock.items.length - 4} more
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search + filters ─── */}
      <div className="space-y-3">
        {/* Row 1: Search + mobile filter button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-9 pr-9 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile filter trigger */}
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 md:hidden relative"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {filtersOpen && (
              <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border bg-background p-4 shadow-lg md:hidden">
                <div className="mb-4 text-left">
                  <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Category
                    </label>
                    <select
                      value={categoryId ?? "all"}
                      onChange={(e) =>
                        setCategoryId(
                          e.target.value === "all" ? null : e.target.value,
                        )
                      }
                      className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c._count.products})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sort by
                    </label>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                    >
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <option key={k} value={k}>
                          {SORT_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-11"
                    onClick={() => {
                      setCategoryId(null);
                      setStatusFilter("ALL");
                      setSortKey("name");
                      setFiltersOpen(false);
                    }}
                  >
                    Reset filters
                  </Button>
                  <Button
                    className="w-full rounded-xl h-11"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </>
        </div>

        {/* Row 2: Category + sort dropdowns — desktop only */}
        <div className="hidden md:flex gap-2">
          <select
            value={categoryId ?? "all"}
            onChange={(e) =>
              setCategoryId(e.target.value === "all" ? null : e.target.value)
            }
            className="h-9 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c._count.products})
              </option>
            ))}
          </select>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Status chips — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(
            [
              {
                key: "ALL",
                label: "All",
                fullLabel: "All products",
                count: stats.totalSkus,
                icon: LayoutGrid,
              },
              {
                key: "LOW",
                label: "Low",
                fullLabel: "Low stock",
                count: stats.lowCount,
                icon: AlertTriangle,
              },
              {
                key: "OUT",
                label: "Out",
                fullLabel: "Out of stock",
                count: stats.outOfStock,
                icon: Ban,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all whitespace-nowrap shrink-0",
                statusFilter === f.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <f.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{f.fullLabel}</span>
              <span className="sm:hidden">{f.label}</span>
              <span
                className={cn(
                  "text-[10px] tabular-nums px-1.5 rounded-full ml-0.5",
                  statusFilter === f.key
                    ? "bg-primary-foreground/20"
                    : "bg-muted",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Products list ─── */}
      {isLoading ? (
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!isLoading && visibleProducts.length === 0 ? (
        <Card className="card-soft border-dashed">
          <CardContent className="py-12 sm:py-16 flex flex-col items-center text-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-1">
              {statusFilter === "LOW"
                ? "No low stock items"
                : statusFilter === "OUT"
                  ? "No out of stock items"
                  : search || categoryId
                    ? "No matching products"
                    : "No products yet"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              {statusFilter === "LOW"
                ? "Everything is adequately stocked right now."
                : statusFilter === "OUT"
                  ? "All products have stock on hand."
                  : search || categoryId
                    ? "Try adjusting your search or filters."
                    : "Add products to start tracking inventory."}
            </p>
            {(search || categoryId || statusFilter !== "ALL") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 rounded-xl"
                onClick={() => {
                  setSearch("");
                  setCategoryId(null);
                  setStatusFilter("ALL");
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ─── Mobile: card list ─── */}
      {!isLoading && visibleProducts.length > 0 && (
        <div className="grid gap-3 md:hidden">
          {visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              canAdjust={canAdjust}
              onAdjust={() => openAdjust(p)}
            />
          ))}
          <div className="text-center text-xs text-muted-foreground py-4">
            Showing {visibleProducts.length}{" "}
            {visibleProducts.length === 1 ? "product" : "products"}
            {statusFilter !== "ALL" && " (filtered)"}
          </div>
        </div>
      )}

      {/* ─── Desktop: table ─── */}
      {!isLoading && visibleProducts.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="min-w-[240px]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <span className="inline-flex items-center gap-1">
                      Stock <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  {canAdjust && (
                    <TableHead className="text-right w-[100px]">
                      Adjust
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProducts.map((p) => {
                  const level = classifyStock(p.stock);
                  const meta = STOCK_META[level];
                  const pct = stockPercent(p.stock);
                  const value = p.stock * Number(p.cost);

                  return (
                    <TableRow
                      key={p.id}
                      className="border-border/40 hover:bg-muted/30"
                    >
                      <TableCell className="align-top py-3">
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {p.sku}
                        </p>
                      </TableCell>

                      <TableCell className="align-top py-3">
                        {p.category ? (
                          <Badge
                            variant="outline"
                            className="border-border/60 text-xs font-normal"
                          >
                            {p.category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-top py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              meta.text,
                            )}
                          >
                            {p.stock}
                          </span>
                          <div className="w-[80px] h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full transition-all", meta.bar)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right align-top py-3 text-sm text-muted-foreground tabular-nums">
                        {peso(Number(p.cost))}
                      </TableCell>

                      <TableCell className="text-right align-top py-3 text-sm font-medium tabular-nums">
                        {peso(value)}
                      </TableCell>

                      <TableCell className="align-top py-3">
                        <Badge
                          variant={meta.badge}
                          className="text-[10px] font-normal"
                        >
                          {meta.label}
                        </Badge>
                      </TableCell>

                      {canAdjust && (
                        <TableCell className="text-right align-top py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => openAdjust(p)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adjust
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
            <span>
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1 ? "product" : "products"}
              {statusFilter !== "ALL" && " (filtered)"}
            </span>
            <span>
              Total value:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {peso(
                  visibleProducts.reduce(
                    (s, p) => s + p.stock * Number(p.cost),
                    0,
                  ),
                )}
              </span>
            </span>
          </div>
        </div>
      )}

      <StockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selected}
      />
    </div>
  );
}
