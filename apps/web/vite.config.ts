import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function appShellServiceWorker(): Plugin {
  return {
    name: "smallbiz-app-shell-service-worker",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((fileName) =>
        /^assets\/.+\.(js|css|svg|woff2?)$/.test(fileName),
      );
      const version = assets
        .join("")
        .split("")
        .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0)
        .toString(36);
      const source = `
const CACHE_NAME = "smallbiz-app-shell-${version}";
const APP_SHELL = ["/", "/index.html", "/storepulse-mark.svg", "/manifest.webmanifest", ${assets.map((asset) => JSON.stringify(`/${asset}`)).join(", ")}];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("smallbiz-app-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(request)) || (await caches.match("/")),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "smallbiz-offline-sales") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) =>
        clients.forEach((client) => client.postMessage({ type: "SYNC_OFFLINE_SALES" })),
      ),
    );
  }
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), appShellServiceWorker()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
