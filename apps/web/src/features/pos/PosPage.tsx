import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  User,
  Tag,
  Package,
  Banknote,
  Smartphone,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import { queueSale } from "@/lib/offline-store";
import { requestBackgroundSync } from "@/components/pwa/PwaRuntime";
import { useCategories } from "@/features/categories/use-categories";
import {
  CartLine,
  PaymentMethod,
  Sale,
  useCheckout,
  useCustomerSearch,
  useProductSearch,
} from "./use-pos";
import { ReceiptDialog } from "./ReceiptDialog";
import { PaymentQrDialog } from "./PaymentQrDialog";
import { OfflineSalesQueue } from "./OfflineSalesQueue";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "GCASH", label: "GCash", icon: Smartphone },
  { value: "MAYA", label: "Maya", icon: Smartphone },
];

interface BusinessProfile {
  id: string;
  name: string;
  gcashQrUrl: string | null;
  mayaQrUrl: string | null;
}

export function PosPage() {
  const user = useAuth((s) => s.user);
  const branchId = useBranchStore((s) => s.selectedBranchId);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState<number | "">("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProductSearch(
    search,
    categoryId ?? undefined,
  );
  const { data: customers = [] } = useCustomerSearch(customerSearch);
  const checkout = useCheckout();

  const { data: profile } = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: async () => (await api.get<BusinessProfile>("/settings")).data,
    staleTime: 60_000,
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [cart],
  );
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  const currentQrUrl =
    paymentMethod === "GCASH"
      ? (profile?.gcashQrUrl ?? null)
      : paymentMethod === "MAYA"
        ? (profile?.mayaQrUrl ?? null)
        : null;

  // ─── Validation state ───
  const trimmedReference = paymentReference.trim();
  const referenceRequired = paymentMethod !== "CASH";
  const referenceMissing = referenceRequired && trimmedReference.length === 0;

  const tenderedNum = Number(amountTendered);
  const cashMissing = paymentMethod === "CASH" && amountTendered === "";
  const cashShort =
    paymentMethod === "CASH" && amountTendered !== "" && tenderedNum < total;

  const changePreview =
    paymentMethod === "CASH" && amountTendered !== "" && tenderedNum >= total
      ? tenderedNum - total
      : null;

  const canCheckout =
    cart.length > 0 &&
    !checkout.isPending &&
    !cashMissing &&
    !cashShort &&
    !referenceMissing;

  function addToCart(
    productId: string,
    name: string,
    sku: string,
    price: string,
    stock: number,
  ) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast.error(`Only ${stock} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      if (stock <= 0) {
        toast.error("Out of stock");
        return prev;
      }
      return [
        ...prev,
        {
          productId,
          name,
          sku,
          unitPrice: Number(price),
          quantity: 1,
          stock,
        },
      ];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = l.quantity + delta;
          if (next > l.stock) {
            toast.error(`Only ${l.stock} in stock`);
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function clearCart() {
    setCart([]);
    setCustomerId("");
    setCustomerSearch("");
    setDiscount(0);
    setPaymentMethod("CASH");
    setAmountTendered("");
    setPaymentReference("");
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (paymentMethod === "CASH") {
      if (cashMissing) {
        toast.error("Enter cash amount received");
        return;
      }
      if (cashShort) {
        toast.error(`Need ₱${(total - tenderedNum).toFixed(2)} more`);
        return;
      }
    }

    if (referenceRequired && referenceMissing) {
      toast.error(
        `Enter the ${paymentMethod === "GCASH" ? "GCash" : "Maya"} reference number`,
      );
      return;
    }

    try {
      const input = {
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        expectedPrices: cart.map((line) => ({
          productId: line.productId,
          unitPrice: line.unitPrice,
        })),
        customerId: customerId || undefined,
        discount,
        paymentMethod,
        amountTendered:
          paymentMethod === "CASH" ? Number(amountTendered) : undefined,
        paymentReference: referenceRequired ? trimmedReference : undefined,
      };
      const idempotencyKey = crypto.randomUUID();

      if (!navigator.onLine) {
        await saveOfflineSale(input, idempotencyKey);
        return;
      }

      const sale = await checkout.mutateAsync({ input, idempotencyKey });
      setReceipt(sale);
      clearCart();
      setCartOpen(false);
      toast.success(`Sale complete — ${peso(Number(sale.total))}`);
    } catch (e) {
      if (
        axios.isAxiosError(e) &&
        !e.response &&
        user &&
        branchId
      ) {
        try {
          await saveOfflineSale(
            {
              items: cart.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
              })),
              expectedPrices: cart.map((line) => ({
                productId: line.productId,
                unitPrice: line.unitPrice,
              })),
              customerId: customerId || undefined,
              discount,
              paymentMethod,
              amountTendered:
                paymentMethod === "CASH" ? Number(amountTendered) : undefined,
              paymentReference: referenceRequired ? trimmedReference : undefined,
            },
            (e.config?.headers?.["Idempotency-Key"] as string | undefined) ??
              crypto.randomUUID(),
          );
        } catch (storageError) {
          toast.error(apiErrorMessage(storageError));
        }
        return;
      }
      toast.error(apiErrorMessage(e));
    }
  }

  async function saveOfflineSale(
    input: Parameters<typeof checkout.mutateAsync>[0]["input"],
    idempotencyKey: string,
  ) {
    if (!user || !branchId) {
      toast.error("Select a branch before saving an offline sale");
      return;
    }
    await queueSale({
      id: idempotencyKey,
      userId: user.id,
      businessId: user.businessId,
      branchId,
      payload: input,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
    window.dispatchEvent(new Event("smallbiz-offline-queue-changed"));
    try {
      await requestBackgroundSync();
    } catch (error) {
      console.warn("Background sync is unavailable; sales will sync when the app is online", error);
    }
    clearCart();
    setCartOpen(false);
    toast.success("Sale saved on this device and will sync when online");
  }

  const quickBills = [
    Math.ceil(total),
    ...[20, 50, 100, 200, 500, 1000].filter((v) => v >= total),
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 4);

  // ─── Cart items ───
  const cartItems = (
    <div className="divide-y divide-border/40">
      {cart.map((line) => (
        <div
          key={line.productId}
          className="px-4 sm:px-5 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate leading-tight">
                {line.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {peso(line.unitPrice)} each
              </p>
            </div>
            <button
              onClick={() => removeLine(line.productId)}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeQty(line.productId, -1)}
                className="h-8 w-8 rounded-md border border-border/60 hover:bg-muted flex items-center justify-center transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-9 text-center text-sm font-medium tabular-nums">
                {line.quantity}
              </span>
              <button
                onClick={() => changeQty(line.productId, 1)}
                className="h-8 w-8 rounded-md border border-border/60 hover:bg-muted flex items-center justify-center transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {peso(line.unitPrice * line.quantity)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Checkout form ───
  const checkoutForm = (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Customer
          </Label>
        </div>
        <Select
          value={customerId || "none"}
          onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}
        >
          <SelectTrigger className="h-10 rounded-lg">
            <SelectValue placeholder="Walk-in customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Walk-in customer</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customers.length > 0 && (
          <Input
            placeholder="Search customers..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="h-9 text-xs rounded-lg"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Discount
          </Label>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₱
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discount || ""}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            className="h-10 w-32 pl-7 text-right rounded-lg tabular-nums"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Payment method
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setPaymentMethod(m.value);
                if (m.value !== "CASH") setAmountTendered("");
                if (m.value !== paymentMethod) setPaymentReference("");
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all",
                paymentMethod === m.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 hover:bg-muted/50",
              )}
            >
              <m.icon
                className={cn(
                  "h-5 w-5",
                  paymentMethod === m.value
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  paymentMethod === m.value
                    ? "text-primary"
                    : "text-foreground",
                )}
              >
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === "CASH" && (
        <div className="space-y-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Label
            htmlFor="tendered"
            className="text-[11px] font-medium text-primary uppercase tracking-wide"
          >
            Cash received
          </Label>
          <Input
            id="tendered"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amountTendered}
            onChange={(e) =>
              setAmountTendered(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            placeholder="0.00"
            className="h-12 text-lg font-bold text-right rounded-lg tabular-nums bg-background"
          />
          <div className="flex flex-wrap gap-1.5">
            {quickBills.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmountTendered(v)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all",
                  tenderedNum === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/30 hover:bg-primary/10",
                )}
              >
                ₱{v.toLocaleString()}
              </button>
            ))}
          </div>
          {changePreview !== null && (
            <div className="flex items-center justify-between pt-2 border-t border-primary/20">
              <span className="text-xs font-medium text-primary">Change</span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {peso(changePreview)}
              </span>
            </div>
          )}
          {cashShort && (
            <div className="flex items-center justify-between pt-2 border-t border-destructive/20">
              <span className="text-xs font-medium text-destructive">
                Short by
              </span>
              <span className="text-lg font-bold tabular-nums text-destructive">
                {peso(total - tenderedNum)}
              </span>
            </div>
          )}
        </div>
      )}

      {paymentMethod !== "CASH" && (
        <div className="space-y-3">
          {/* QR preview / trigger */}
          <button
            type="button"
            onClick={() => setQrDialogOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-3 transition-all text-left",
              currentQrUrl
                ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                : "border-amber-500/30 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]",
            )}
          >
            <div
              className={cn(
                "h-14 w-14 rounded-lg flex items-center justify-center shrink-0",
                currentQrUrl
                  ? "bg-white border border-border/60"
                  : "bg-amber-500/15",
              )}
            >
              {currentQrUrl ? (
                <img
                  src={currentQrUrl}
                  alt="QR code"
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <QrCode className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  currentQrUrl ? "text-foreground" : "text-amber-700",
                )}
              >
                {currentQrUrl ? "Show QR code" : "No QR code uploaded"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentQrUrl
                  ? "Tap to display the customer's QR"
                  : "Ask the owner to add one in Settings"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {/* Reference number — REQUIRED */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="reference"
                className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
              >
                Reference # <span className="text-destructive">*</span>
              </Label>
              {referenceMissing && (
                <span className="text-[10px] font-medium text-destructive">
                  Required
                </span>
              )}
            </div>
            <Input
              id="reference"
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder={
                paymentMethod === "GCASH"
                  ? "GCash reference from confirmation"
                  : "Maya reference from confirmation"
              }
              maxLength={64}
              className={cn(
                "h-10 rounded-lg",
                referenceMissing &&
                  "border-destructive/50 focus-visible:ring-destructive/30",
              )}
            />
            {referenceMissing ? (
              <div className="flex items-start gap-1.5 text-[11px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Enter the {paymentMethod === "GCASH" ? "GCash" : "Maya"}{" "}
                  reference number from the customer's confirmation screen to
                  continue.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Enter the reference from the customer's payment confirmation for
                reconciliation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const totalsBlock = (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal · {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span className="tabular-nums">{peso(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-destructive">
          <span>Discount</span>
          <span className="tabular-nums">−{peso(discount)}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
        <span className="text-sm font-medium">Total</span>
        <span className="text-2xl font-bold tracking-tight tabular-nums">
          {peso(total)}
        </span>
      </div>
    </div>
  );

  const checkoutButton = (
    <Button
      className="w-full h-12 rounded-xl font-semibold text-base"
      onClick={handleCheckout}
      disabled={!canCheckout}
    >
      {checkout.isPending ? (
        "Processing..."
      ) : referenceMissing ? (
        <>
          <AlertCircle className="h-4 w-4 mr-2" />
          Enter reference number
        </>
      ) : cashMissing ? (
        "Enter cash amount"
      ) : cashShort ? (
        `Short by ${peso(total - tenderedNum)}`
      ) : (
        <>
          Checkout {peso(total)}
          <ChevronRight className="h-4 w-4 ml-1" />
        </>
      )}
    </Button>
  );

  return (
    <>
      <OfflineSalesQueue />
      <div className="space-y-4">
        <PageHeader
          title="Point of Sale"
          description="Tap a product to add it to the order"
        >
          <Badge variant="outline" className="border-border/60">
            {products.length} products
          </Badge>
        </PageHeader>
        <div className="lg:h-[calc(100vh-12rem)] grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col min-w-0 lg:min-h-0">
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-10 h-11 rounded-xl bg-card border-border/60"
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

          {categories.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 shrink-0">
              <button
                onClick={() => setCategoryId(null)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0",
                  categoryId === null
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                All
              </button>
              {categories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(active ? null : cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {cat.name}
                    {cat._count.products > 0 && (
                      <span
                        className={cn(
                          "text-[10px] tabular-nums px-1.5 rounded-full",
                          active ? "bg-primary-foreground/20" : "bg-muted",
                        )}
                      >
                        {cat._count.products}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 lg:overflow-y-auto lg:-mx-1 lg:px-1 pb-24 lg:pb-2">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try a different search term"
                    : categoryId
                      ? "No products in this category"
                      : "Add products to get started"}
                </p>
                {categoryId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl"
                    onClick={() => setCategoryId(null)}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => {
                  const inCart =
                    cart.find((l) => l.productId === p.id)?.quantity ?? 0;
                  const available = p.stock - inCart;
                  const isOut = available <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        addToCart(p.id, p.name, p.sku, p.price, p.stock)
                      }
                      disabled={isOut}
                      className={cn(
                        "group relative text-left rounded-xl border bg-card p-3 sm:p-3.5 transition-all",
                        "hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
                        "active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
                        inCart > 0
                          ? "border-primary/60 ring-1 ring-primary/20"
                          : "border-border/60",
                      )}
                    >
                      {inCart > 0 && (
                        <div className="absolute -top-2 -right-2 h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                          {inCart}
                        </div>
                      )}
                      <div className="flex flex-col h-full">
                        <div className="flex-1 min-h-[2.75rem]">
                          <p className="font-medium text-sm leading-tight line-clamp-2">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                            {p.sku}
                          </p>
                        </div>
                        <div className="flex items-end justify-between mt-2 gap-2">
                          <span className="text-base font-bold tracking-tight">
                            {peso(Number(p.price))}
                          </span>
                          <Badge
                            variant={
                              available <= 5 ? "destructive" : "secondary"
                            }
                            className="text-[10px] h-5 px-1.5 shrink-0"
                          >
                            {available}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Card className="hidden lg:flex flex-col min-h-0 overflow-hidden border-border/60 shadow-sm">
          <div className="shrink-0 px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Current Order</h3>
              {itemCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                onClick={clearCart}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center px-5">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap products to add them here
                </p>
              </div>
            ) : (
              <>
                {cartItems}
                <div className="px-5 py-4 border-t border-border/60 bg-muted/20">
                  {checkoutForm}
                </div>
                <div className="sticky bottom-0 px-5 py-4 border-t border-border/60 bg-card shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]">
                  {totalsBlock}
                  <div className="mt-4">{checkoutButton}</div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {cart.length > 0 && !cartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
          <Button
            className="w-full h-12 rounded-xl font-semibold justify-between px-5"
            onClick={() => setCartOpen(true)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-4 w-4" />
                <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-background text-primary text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <span>View Order</span>
            </div>
            <span className="tabular-nums">{peso(total)}</span>
          </Button>
        </div>
      )}

      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300",
          cartOpen ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
      >
        <div className="shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setCartOpen(false)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground -ml-1 p-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Current Order</h3>
              {itemCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </div>
            {cart.length > 0 ? (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive p-1"
              >
                Clear
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center px-5">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go back and tap products to add them
              </p>
            </div>
          ) : (
            <>
              {cartItems}
              <div className="px-4 py-4 border-t border-border/40">
                {checkoutForm}
              </div>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="shrink-0 border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {totalsBlock}
            <div className="mt-4">{checkoutButton}</div>
          </div>
        )}
      </div>

        {paymentMethod !== "CASH" && (
          <PaymentQrDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            method={paymentMethod as "GCASH" | "MAYA"}
            qrUrl={currentQrUrl}
            amount={total}
          />
        )}

        <ReceiptDialog
          sale={receipt}
          businessName={user?.businessName ?? "Receipt"}
          onClose={() => setReceipt(null)}
        />
      </div>
    </>
  );
}
