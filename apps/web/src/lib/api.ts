import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useBranchStore } from "./branch-store";

const apiBaseUrl =
  (
    import.meta as ImportMeta & {
      env: {
        VITE_API_URL?: string;
      };
    }
  ).env.VITE_API_URL ?? "/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/*
|--------------------------------------------------------------------------
| Request interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const branchId = useBranchStore.getState().selectedBranchId;
  if (branchId) config.headers["x-branch-id"] = branchId;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const method = config.method?.toLowerCase();

  if (method && ["post", "patch", "put", "delete"].includes(method)) {
    if (!config.headers["Idempotency-Key"]) {
      config.headers["Idempotency-Key"] = crypto.randomUUID();
    }
  }

  return config;
});

/*
|--------------------------------------------------------------------------
| Refresh token
|--------------------------------------------------------------------------
*/

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    // Use plain axios here.
    // This prevents the refresh request from
    // entering the same response interceptor.
    const response = await axios.post(
      `${apiBaseUrl}/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );

    const token = response.data?.accessToken ?? null;

    if (!token) {
      setAccessToken(null);
      return null;
    }

    setAccessToken(token);

    return token;
  } catch (error) {
    setAccessToken(null);
    throw error;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/*
|--------------------------------------------------------------------------
| Response interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    if (!original) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    const url = original.url ?? "";

    /*
     * Only refresh normal authenticated requests.
     * Never refresh login/register/refresh/logout.
     */
    if (status === 401 && !original._retry && !url.includes("/auth/")) {
      original._retry = true;

      /*
       * Prevent multiple simultaneous refresh calls.
       */
      const token = await refreshAccessToken().catch(() => null);

      if (token) {
        original.headers.Authorization = `Bearer ${token}`;

        // Retry the original request.
        return api(original);
      }

      /*
       * Refresh token is invalid or expired.
       */
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

/*
|--------------------------------------------------------------------------
| API error helper
|--------------------------------------------------------------------------
*/

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      return "Access Restricted";
    }

    if (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
      return "The login service is temporarily unavailable. Please try again in a moment.";
    }

    if (error.code === "ERR_NETWORK") {
      return "Unable to reach the server. Please check your connection and try again.";
    }

    const data = error.response?.data as
      | {
          message?: string;
          error?: string;
        }
      | undefined;

    return data?.message ?? data?.error ?? error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong";
}
