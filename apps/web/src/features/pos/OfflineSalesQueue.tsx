import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import { usePwaStore } from "@/lib/pwa-store";
import {
  getPendingSales,
  PendingSale,
  removePendingSale,
  updatePendingSale,
} from "@/lib/offline-store";

export function OfflineSalesQueue() {
  const user = useAuth((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const online = usePwaStore((state) => state.online);
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [syncedSales, setSyncedSales] = useState<PendingSale[]>([]);

  const reload = useCallback(async () => {
    if (!user || !branchId) {
      setSales([]);
      return;
    }
    const queued = await getPendingSales();
    setSales(
      queued.filter(
        (sale) => sale.userId === user.id && sale.branchId === branchId,
      ),
    );
  }, [branchId, user]);

  useEffect(() => {
    void reload().catch((error: unknown) => {
      console.error("Unable to read offline sales", error);
      toast.error("Could not load offline sales from this device");
    });
    const changed = () => {
      void reload().catch((error: unknown) => {
        console.error("Unable to refresh offline sales", error);
      });
    };
    const saleSynced = (event: Event) => {
      const sale = (event as CustomEvent<PendingSale>).detail;
      if (!user || !branchId) return;
      if (
        sale.userId !== user.id ||
        sale.businessId !== user.businessId ||
        sale.branchId !== branchId
      ) {
        return;
      }

      setSyncedSales((current) => {
        const next = [sale, ...current.filter((item) => item.id !== sale.id)].slice(0, 5);
        return next;
      });

      // auto-dismiss synced notification after 6s
      setTimeout(() => {
        setSyncedSales((current) => current.filter((s) => s.id !== sale.id));
      }, 6000);
    };

    window.addEventListener("smallbiz-offline-queue-changed", changed);
    window.addEventListener("smallbiz-offline-sale-synced", saleSynced);
    return () => {
      window.removeEventListener("smallbiz-offline-queue-changed", changed);
      window.removeEventListener("smallbiz-offline-sale-synced", saleSynced);
    };
  }, [reload, branchId, user]);

  async function retry(sale: PendingSale) {
    try {
      await updatePendingSale({ ...sale, status: "pending", error: undefined });
      window.dispatchEvent(new Event("smallbiz-offline-queue-changed"));
      window.dispatchEvent(new Event("smallbiz-retry-offline-sales"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry sale");
    }
  }

  async function discard(sale: PendingSale) {
    if (!window.confirm("Discard this unsynced sale? This cannot be undone.")) {
      return;
    }
    try {
      await removePendingSale(sale.id);
      window.dispatchEvent(new Event("smallbiz-offline-queue-changed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not discard sale");
    }
  }

  const visibleSyncedSales = syncedSales.filter(
    (sale) =>
      sale.userId === user?.id &&
      sale.businessId === user?.businessId &&
      sale.branchId === branchId,
  );
  const pendingSales = sales.filter((sale) => sale.status === "pending");
  const failedSales = sales.filter((sale) => sale.status === "needs-attention");
  if (sales.length === 0 && visibleSyncedSales.length === 0) return null;

  function saleAmount(sale: PendingSale) {
    const subtotal = sale.payload.expectedPrices?.reduce((sum, item) => {
      const quantity =
        sale.payload.items.find((line) => line.productId === item.productId)
          ?.quantity ?? 0;
      return sum + item.unitPrice * quantity;
    }, 0);
    return subtotal === undefined
      ? "Sale"
      : `₱${Math.max(0, subtotal - sale.payload.discount).toFixed(2)}`;
  }

  function saleTime(sale: PendingSale) {
    return new Date(sale.createdAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    // Floating, stacked notifications — mobile-first, compact
    <div className="fixed z-50 left-4 right-4 bottom-4 flex items-end justify-center md:right-6 md:bottom-6 md:justify-end pointer-events-none">
      <div className="w-full max-w-md md:max-w-xs flex flex-col items-end gap-2 pointer-events-auto">
        <div className="mb-1 flex w-full items-center justify-between gap-2 rounded-lg bg-card/80 px-3 py-2 shadow">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {pendingSales.length > 0 ? (
              <>
                <Clock3 className="h-4 w-4 text-amber-600" aria-hidden />
                {pendingSales.length} {pendingSales.length === 1 ? "Sale" : "Sales"} Pending
              </>
            ) : failedSales.length > 0 ? (
              <>
                <XCircle className="h-4 w-4 text-red-600" aria-hidden />
                {failedSales.length} Need Attention
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
                All synced
              </>
            )}
          </div>
          {online && pendingSales.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => window.dispatchEvent(new Event("smallbiz-retry-offline-sales"))}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Sync now
            </Button>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          <ul className="space-y-1">
            {[...visibleSyncedSales.map((sale) => ({ sale, status: "synced" as const })),
              ...sales.map((sale) => ({
                sale,
                status: sale.status === "pending" ? "pending" as const : "failed" as const,
              })),
            ].map(({ sale, status }) => {
              return (
                <li
                  key={sale.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/30">
                      {status === "synced" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : status === "pending" ? (
                        <Clock3 className="h-5 w-5 text-amber-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{saleAmount(sale)}</div>
                      <div className="text-xs text-muted-foreground">{saleTime(sale)}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status === "failed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => void retry(sale)}
                        aria-label="Retry failed sale"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {status !== "synced" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => void discard(sale)}
                        aria-label="Discard sale"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-center text-xs text-muted-foreground">Auto-syncs when back online</p>
        </div>
      </div>
    </div>
  );
}
