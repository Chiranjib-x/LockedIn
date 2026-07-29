"use client";

import { useEffect } from "react";

// Phase 20 PWA client glue: service-worker registration, mounted in the root
// layout. The install card moved to components/install-prompt.tsx — it grew an
// iOS path and a snooze, and did not belong in the same file as the SW.


export function RegisterSW() {
  useEffect(() => {
    // Dev never registers: a SW caching stale chunks fights HMR.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (private mode, unsupported) just means no offline
      // support — the app itself is unaffected.
    });
  }, []);
  return null;
}
