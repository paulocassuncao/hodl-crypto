"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that powers offline caching and backgrounded
 * alert notifications. Production-only — registering in dev fights Next's HMR
 * and serves stale chunks. Renders nothing.
 */
export const ServiceWorkerRegister = (): null => {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal; the app works without the SW.
    });
  }, []);

  return null;
};
