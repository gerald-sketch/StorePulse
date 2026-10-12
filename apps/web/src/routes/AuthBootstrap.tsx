import { useEffect, useState } from "react";
import axios from "axios";
import { api, setAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { user, clear } = useAuth.getState();

      // No persisted user — nothing to restore
      if (!user) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const res = await api.post<{ accessToken: string }>("/auth/refresh");
        if (!cancelled && res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
        }
      } catch (error) {
        if (
          !cancelled &&
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          clear();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!useAuth.getState().user) return;
      try {
        const response = await api.post<{ accessToken?: string }>("/auth/refresh");
        if (response.data.accessToken) setAccessToken(response.data.accessToken);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          useAuth.getState().clear();
        }
      }
    };

    window.addEventListener("online", restoreSession);
    return () => window.removeEventListener("online", restoreSession);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center animate-pulse">
            <svg
              className="h-4 w-4 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
