import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import {
  api,
  apiErrorMessage,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import {
  getPendingSales,
  removePendingSale,
  updatePendingSale,
} from "@/lib/offline-store";
import { InstallPromptEvent, usePwaStore } from "@/lib/pwa-store";

export async function requestBackgroundSync(): Promise<void> {
  if (
    !("serviceWorker" in navigator) ||
    !navigator.serviceWorker.controller
  ) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const syncRegistration = registration as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  if (syncRegistration.sync) {
    await syncRegistration.sync.register("smallbiz-offline-sales");
  }
}

export function PwaRuntime() {
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const setOnline = usePwaStore((state) => state.setOnline);
  const setInstallPrompt = usePwaStore((state) => state.setInstallPrompt);
  const setSalesStatus = usePwaStore((state) => state.setSalesStatus);
  const syncing = useRef(false);
  const connectionCheck = useRef<Promise<boolean> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(5000);

  const checkConnection = useCallback((): Promise<boolean> => {
    if (!navigator.onLine) {
      setOnline(false);
      return Promise.resolve(false);
    }
    if (connectionCheck.current) return connectionCheck.current;

    connectionCheck.current = api
      .get<{ ok?: boolean }>("/health", {
        timeout: 5000,
        headers: { "Cache-Control": "no-cache" },
      })
      .then((response) => {
        const reachable = navigator.onLine && response.data?.ok === true;
        setOnline(reachable);
        return reachable;
      })
      .catch(() => {
        setOnline(false);
        return false;
      })
      .finally(() => {
        connectionCheck.current = null;
      });

    return connectionCheck.current;
  }, [setOnline]);

  const refreshSalesStatus = useCallback(async () => {
    const queued = await getPendingSales();
    setSalesStatus(
      queued.filter((sale) => sale.status === "pending").length,
      queued.filter((sale) => sale.status === "needs-attention").length,
    );
  }, [setSalesStatus]);

  const syncSales = useCallback(async () => {
    if (!usePwaStore.getState().online || !user || !branchId || syncing.current) return;
    syncing.current = true;
    let shouldRetry = false;
    try {
      const queued = await getPendingSales();
      const salesToSync = queued.filter(
        (sale) =>
          sale.status === "pending" &&
          sale.userId === user.id &&
          sale.businessId === user.businessId &&
          sale.branchId === branchId,
      );
      if (salesToSync.length === 0) return;

      if (!getAccessToken()) {
        const token = await refreshAccessToken();
        if (!token) {
          shouldRetry = true;
          return;
        }
      }

      let syncedCount = 0;
      for (const sale of salesToSync) {
        try {
          const response = await api.post("/pos/checkout", sale.payload, {
            headers: { "Idempotency-Key": sale.id },
          });
          if (response.status === 202) {
            shouldRetry = true;
            break;
          }
          await removePendingSale(sale.id);
          window.dispatchEvent(
            new CustomEvent("smallbiz-offline-sale-synced", { detail: sale }),
          );
          syncedCount += 1;
        } catch (error) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;
          if (status === undefined || status >= 500) {
            shouldRetry = true;
            break;
          }
          if (status === 401) break;

          await updatePendingSale({
            ...sale,
            status: "needs-attention",
            error: apiErrorMessage(error),
          });
          toast.error(`An offline sale needs attention: ${apiErrorMessage(error)}`);
        }
      }
      if (syncedCount > 0) {
        await Promise.all(
          [
            ["products"],
            ["dashboard"],
            ["reports"],
            ["pos", "products"],
            ["sales-history"],
          ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }
      if (!shouldRetry) retryDelay.current = 5000;
    } catch (error) {
      console.error("Unable to sync offline sales", error);
      shouldRetry = true;
    } finally {
      syncing.current = false;
      window.dispatchEvent(new Event("smallbiz-offline-queue-changed"));
      try {
        await refreshSalesStatus();
      } catch (error) {
        console.error("Unable to refresh offline sales status", error);
      }
      if (shouldRetry && navigator.onLine && retryTimer.current === null) {
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          retryDelay.current = Math.min(retryDelay.current * 2, 60000);
          void checkConnection().then((reachable) => {
            if (reachable) void syncSales();
          });
        }, retryDelay.current);
      }
    }
  }, [branchId, checkConnection, queryClient, refreshSalesStatus, user]);

  useEffect(() => {
    const updateConnection = async () => {
      const reachable = await checkConnection();
      if (reachable) void syncSales();
    };
    const promptInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    const queueChanged = () => {
      void refreshSalesStatus().catch((error: unknown) => {
        console.error("Unable to refresh offline sales status", error);
      });
    };
    const syncMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "SYNC_OFFLINE_SALES") void syncSales();
    };
    const retrySales = () => void syncSales();

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
      navigator.serviceWorker.addEventListener("message", syncMessage);
    }
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("focus", updateConnection);
    window.addEventListener("pageshow", updateConnection);
    document.addEventListener("visibilitychange", updateConnection);
    window.addEventListener("beforeinstallprompt", promptInstall);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("smallbiz-offline-queue-changed", queueChanged);
    window.addEventListener("smallbiz-retry-offline-sales", retrySales);
    const syncInterval = window.setInterval(() => {
      void updateConnection();
    }, 10000);
    void updateConnection();
    void refreshSalesStatus().catch((error: unknown) => {
      console.error("Unable to refresh offline sales status", error);
    });
    if (navigator.onLine) void syncSales();

    return () => {
      if (retryTimer.current !== null) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      window.clearInterval(syncInterval);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("focus", updateConnection);
      window.removeEventListener("pageshow", updateConnection);
      document.removeEventListener("visibilitychange", updateConnection);
      window.removeEventListener("beforeinstallprompt", promptInstall);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("smallbiz-retry-offline-sales", retrySales);
      window.removeEventListener("smallbiz-offline-queue-changed", queueChanged);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", syncMessage);
      }
    };
  }, [checkConnection, refreshSalesStatus, setInstallPrompt, syncSales]);

  useEffect(() => {
    void checkConnection().then((reachable) => {
      if (reachable) void syncSales();
    });
  }, [branchId, checkConnection, syncSales, user?.id]);

  return null;
}
