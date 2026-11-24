"use client";

import { useEffect } from "react";

export function SwRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Non-fatal in restricted/non-HTTPS LAN environments
    });
  }, []);

  return null;
}
