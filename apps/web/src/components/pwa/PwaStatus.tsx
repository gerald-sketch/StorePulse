import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { usePwaStore } from "@/lib/pwa-store";

interface PwaStatusProps {
  showQueueStatus?: boolean;
}

export function PwaStatus({ showQueueStatus = true }: PwaStatusProps) {
  const online = usePwaStore((state) => state.online);
  const pendingSales = usePwaStore((state) => state.pendingSales);
  const attention = usePwaStore((state) => state.salesNeedingAttention);

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-end gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
          online
            ? "bg-primary/10 text-primary"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        }`}
        role="status"
      >
        {online ? (
          <Wifi className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
        {online ? "Online" : "Offline"}
      </span>
      {showQueueStatus && (pendingSales > 0 || attention > 0) && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
            attention > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
          role="status"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {pendingSales} waiting{attention ? ` · ${attention} need review` : ""}
        </span>
      )}
    </div>
  );
}
