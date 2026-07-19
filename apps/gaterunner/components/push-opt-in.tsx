"use client";

import { useEffect, useState } from "react";
import { createClient } from "@suite/auth/client";
import {
  ensureNativePushSubscription,
  ensurePushSubscription,
  isNativeApp,
  pushSupported,
} from "@suite/lib/push";

const DONE_KEY = "gr-push-optin-done";

// Contextual permission ask — pickups are time-critical, so this is the one
// app where push is near-mandatory for a good experience.
export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DONE_KEY) !== null) return;
    if (isNativeApp()) {
      setShow(true);
      return;
    }
    if (!pushSupported() || Notification.permission === "denied") return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3">
      <span className="text-xl">🔔</span>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        Get pinged the second someone claims your delivery — or drops it off.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const supabase = createClient();
          if (isNativeApp()) await ensureNativePushSubscription(supabase, "gaterunner");
          else await ensurePushSubscription(supabase, "gaterunner");
          localStorage.setItem(DONE_KEY, "1");
          setShow(false);
        }}
        className="press min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable"}
      </button>
      <button
        aria-label="Not now"
        onClick={() => {
          localStorage.setItem(DONE_KEY, "1");
          setShow(false);
        }}
        className="press min-h-11 shrink-0 px-1 text-muted-foreground"
      >
        ✕
      </button>
    </div>
  );
}
