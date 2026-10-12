import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";
import { api, apiErrorMessage, getAccessToken, setAccessToken } from "@/lib/api";
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
  const user = useAuth((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const setOnline = usePwaStore((state) => state.setOnline);
  const setInstallPrompt = usePwaStore((state) => state.setInstallPrompt);
  const setSalesStatus = usePwaStore((state) => state.setSalesStatus);
  const syncing = useRef(false);

  const refreshSalesStatus = useCallback(async () => {
    const queued = await getPendingSales();
    setSalesStatus(
      queued.filter((sale) => sale.status === "pending").length,
      queued.filter((sale) => sale.status === "needs-attention").length,
    );
  }, [setSalesStatus]);

  const syncSales = useCallback(async () => {
    if (!navigator.onLine || !user || !branchId || syncing.current) return;
    syncing.current = true;
    try {
      if (!getAccessToken()) {
        const response = await api.post<{ accessToken?: string }>("/auth/refresh");
        if (!response.data.accessToken) return;
        setAccessToken(response.data.accessToken);
      }

      const queued = await getPendingSales();
      for (const sale of queued) {
        if (
          sale.status !== "pending" ||
          sale.userId !== user.id ||
          sale.businessId !== user.businessId ||
          sale.branchId !== branchId
        ) {
          continue;
        }
        try {
          await api.post("/pos/checkout", sale.payload, {
            headers: { "Idempotency-Key": sale.id },
          });
          await removePendingSale(sale.id);
        } catch (error) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;
          if (status === undefined || status >= 500 || status === 401) break;

          await updatePendingSale({
            ...sale,
            status: "needs-attention",
            error: apiErrorMessage(error),
          });
          toast.error(`An offline sale needs attention: ${apiErrorMessage(error)}`);
        }
      }
    } catch (error) {
      console.error("Unable to sync offline sales", error);
    } finally {
      syncing.current = false;
      await refreshSalesStatus();
    }
  }, [branchId, refreshSalesStatus, user]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    const promptInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    const queueChanged = () => void refreshSalesStatus();
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
    updateConnection();
    void refreshSalesStatus();
    if (navigator.onLine) void syncSales();

    return () => {
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
  }, [refreshSalesStatus, setInstallPrompt, setOnline, syncSales]);

  useEffect(() => {
    if (navigator.onLine) void syncSales();
  }, [branchId, syncSales, user?.id]);

  return null;
}
