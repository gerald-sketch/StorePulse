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
      if (
        !user ||
        !branchId ||
        sale.userId !== user.id ||
        sale.businessId !== user.businessId ||
        sale.branchId !== branchId
      ) {
        return;
      }
      setSyncedSales((current) =>
        [sale, ...current.filter((item) => item.id !== sale.id)].slice(0, 5),
      );
    };
    window.addEventListener("smallbiz-offline-queue-changed", changed);
    window.addEventListener("smallbiz-offline-sale-synced", saleSynced);
    return () => {
      window.removeEventListener("smallbiz-offline-queue-changed", changed);
      window.removeEventListener("smallbiz-offline-sale-synced", saleSynced);
    };
  }, [reload]);

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
    <section
      aria-label="Sales sync status"
      className="mb-3 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {pendingSales.length > 0 ? (
            <>
              <Clock3
                className="h-4 w-4 text-amber-600"
                aria-hidden="true"
              />
              {pendingSales.length}{" "}
              {pendingSales.length === 1 ? "Sale" : "Sales"} Pending Sync
            </>
          ) : failedSales.length > 0 ? (
            <>
              <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              {failedSales.length}{" "}
              {failedSales.length === 1 ? "Sale" : "Sales"} Need Attention
            </>
          ) : (
            <>
              <CheckCircle2
                className="h-4 w-4 text-green-600"
                aria-hidden="true"
              />
              Sales Synced
            </>
          )}
        </h2>
        {online && pendingSales.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() =>
              window.dispatchEvent(new Event("smallbiz-retry-offline-sales"))
            }
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Sync now
          </Button>
        )}
      </div>
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
              className="flex min-h-9 items-center gap-2 rounded-lg bg-background/70 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {saleAmount(sale)}
              </span>
              <time
                className="shrink-0 text-xs text-muted-foreground"
                dateTime={sale.createdAt}
              >
                {saleTime(sale)}
              </time>
              {status === "synced" ? (
                <span title="Synced">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-green-600"
                    aria-label="Synced"
                  />
                </span>
              ) : status === "pending" ? (
                <span title="Pending sync">
                  <Clock3
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-label="Pending sync"
                  />
                </span>
              ) : (
                <>
                  <span title={sale.error ?? "Sync failed"}>
                    <XCircle
                      className="h-4 w-4 shrink-0 text-red-600"
                      aria-label={sale.error ?? "Sync failed"}
                    />
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => void retry(sale)}
                    aria-label="Retry failed sale"
                    title="Retry"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {status !== "synced" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void discard(sale)}
                  aria-label="Discard sale"
                  title="Discard"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Auto-syncs when back online
      </p>
    </section>
  );
}
