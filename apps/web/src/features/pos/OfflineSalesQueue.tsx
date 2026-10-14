import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
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
  const syncingSaleId = usePwaStore((state) => state.syncingSaleId);
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [syncedSales, setSyncedSales] = useState<PendingSale[]>([]);
  const [expanded, setExpanded] = useState(false);

  const reload = useCallback(async () => {
    const queued = await getPendingSales();
    if (!user || !branchId) {
      setSales([]);
      return;
    }
    setSales(
      queued.filter(
        (sale) =>
          sale.userId === user.id &&
          sale.businessId === user.businessId &&
          sale.branchId === branchId,
      ),
    );
  }, [branchId, user]);

  useEffect(() => {
    void Promise.resolve()
      .then(reload)
      .catch((error: unknown) => {
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

      setSyncedSales((current) =>
        [sale, ...current.filter((item) => item.id !== sale.id)].slice(0, 5),
      );
      setTimeout(() => {
        setSyncedSales((current) => current.filter((item) => item.id !== sale.id));
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

  const statusCount = pendingSales.length + failedSales.length;

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
    <div className="relative w-full sm:w-auto">
      <section className="relative">
        <button
          type="button"
          className={`mx-auto flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mx-0 sm:h-9 ${
            statusCount > 0
              ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
              : "bg-green-500/10 text-green-700 hover:bg-green-500/15 dark:text-green-300"
          }`}
          aria-expanded={expanded}
          aria-controls="offline-sales-list"
          onClick={() => setExpanded((current) => !current)}
        >
          {statusCount > 0 ? (
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span>{statusCount > 0 ? "Pending Sync" : "All synced"}</span>
          {statusCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] tabular-nums">
              {statusCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div
          id="offline-sales-list"
          className={`absolute left-0 right-0 top-full z-50 mt-2 grid w-full overflow-hidden rounded-xl border bg-card shadow-xl transition-[grid-template-rows,opacity] duration-200 ease-out sm:left-auto sm:right-0 sm:w-[min(20rem,calc(100vw-2rem))] ${
            expanded
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className="min-h-0">
            <div className="max-h-[min(20rem,calc(100dvh-10rem))] overflow-y-auto px-3 py-2.5">
              {online && pendingSales.length > 0 && (
                <div className="mb-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 px-3 text-xs sm:h-7 sm:px-2"
                    onClick={() => window.dispatchEvent(new Event("smallbiz-retry-offline-sales"))}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync now
                  </Button>
                </div>
              )}
              {sales.length > 0 || visibleSyncedSales.length > 0 ? (
                <ul className="space-y-1">
                  {[
                    ...visibleSyncedSales.map((sale) => ({ sale, status: "synced" as const })),
                    ...sales.map((sale) => ({
                      sale,
                      status:
                        sale.status === "needs-attention"
                          ? ("failed" as const)
                          : sale.id === syncingSaleId
                            ? ("syncing" as const)
                            : ("waiting" as const),
                    })),
                  ].map(({ sale, status }) => {
                    const statusStyles = {
                      waiting: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                      syncing: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                      synced: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
                      failed: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                    }[status];
                    const statusIconStyles = {
                      waiting: "text-amber-600 dark:text-amber-300",
                      syncing: "animate-spin text-blue-600 dark:text-blue-300",
                      synced: "text-green-600 dark:text-green-300",
                      failed: "text-red-600 dark:text-red-300",
                    }[status];
                    const StatusIcon = {
                      waiting: Clock3,
                      syncing: RefreshCw,
                      synced: CheckCircle2,
                      failed: XCircle,
                    }[status];
                    const statusLabel = {
                      waiting: "Pending",
                      syncing: "Syncing",
                      synced: "Synced",
                      failed: "Failed",
                    }[status];

                    return (
                      <li
                        key={sale.id}
                        className="flex flex-col gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <StatusIcon
                            className={`h-4 w-4 shrink-0 ${statusIconStyles}`}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{saleAmount(sale)}</div>
                            <div className="text-xs text-muted-foreground">{saleTime(sale)}</div>
                          </div>
                        </div>
                        <div className="flex w-full shrink-0 items-center justify-between gap-1.5 sm:w-auto sm:justify-start">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles}`}>
                            {statusLabel}
                          </span>
                          {status === "failed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 px-3 text-xs text-red-700 hover:text-red-800 dark:text-red-300 sm:h-7 sm:px-2"
                              onClick={() => void retry(sale)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                          {status !== "synced" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive sm:h-7 sm:w-7"
                              onClick={() => void discard(sale)}
                              aria-label="Discard sale"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  No pending sales
                </p>
              )}
              <p className="pt-2 text-center text-[11px] text-muted-foreground">
                Auto-syncs when online
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
