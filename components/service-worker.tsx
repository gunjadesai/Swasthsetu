"use client";

import { useEffect } from "react";

// Registers public/sw.js, which keeps the app shell loadable without a
// connection and shows /offline instead of a browser error page.
//
// Production only: in dev, a service worker sitting in front of
// Turbopack's HMR requests is a source of confusing stale-asset bugs,
// and there is nothing to gain from it on a machine with a network.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // After load, so registration never competes with first paint on a
    // slow rural connection.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[sw] registration failed:", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
