import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
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
    window.addEventListener("smallbiz-offline-queue-changed", changed);
    return () =>
      window.removeEventListener("smallbiz-offline-queue-changed", changed);
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

  if (sales.length === 0) return null;

  return (
    <section
      aria-label="Offline sales"
      className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold">Offline sales on this device</h2>
      </div>
      <ul className="space-y-2">
        {sales.map((sale) => {
          const expectedTotal = sale.payload.expectedPrices?.reduce(
            (sum, item) => {
              const quantity =
                sale.payload.items.find(
                  (line) => line.productId === item.productId,
                )?.quantity ?? 0;
              return sum + item.unitPrice * quantity;
            },
            0,
          );
          const timestamp = new Date(sale.createdAt).toLocaleString();
          return (
            <li
              key={sale.id}
              className="flex flex-col gap-2 rounded-lg bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {expectedTotal === undefined
                    ? "Sale"
                    : `Sale · ₱${Math.max(0, expectedTotal - sale.payload.discount).toFixed(2)}`}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {timestamp}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {sale.status === "needs-attention"
                    ? sale.error ?? "This sale could not be synced"
                    : online
                      ? "Waiting to sync"
                      : "Waiting for connection"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {(sale.status === "needs-attention" || online) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void retry(sale)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {sale.status === "needs-attention" ? "Retry" : "Sync now"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void discard(sale)}
                  aria-label="Discard unsynced sale"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
