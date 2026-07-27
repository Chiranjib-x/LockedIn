"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@suite/auth/client";
import {
  ensureNativePushSubscription,
  ensurePushSubscription,
  isNativeApp,
  pushSupported,
} from "@suite/lib/push";

const DONE_KEY = "gr-push-optin-done";
const SNOOZE_KEY = "gr-push-optin-snoozed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// Captured once per page load, deliberately NOT read inside the snapshot:
// useSyncExternalStore calls getSnapshot repeatedly during render, and a value
// that moves on every call is how you get a render loop. Re-asking one page load
// later is exactly the granularity we want anyway.
const LOADED_AT = Date.now();

// Contextual permission ask — pickups are time-critical, so this is the one
// app where push is near-mandatory for a good experience.
// Whether this device should be asked at all — a browser-state read, so it goes
// through useSyncExternalStore rather than an effect: the server snapshot is
// `false`, which both avoids a hydration mismatch and satisfies
// react-hooks/set-state-in-effect. Nothing external emits changes here, so
// `subscribe` is a no-op.
const noopSubscribe = () => () => {};
function eligibleSnapshot() {
  // DONE means the student actually enabled push. Only success writes it.
  if (localStorage.getItem(DONE_KEY) !== null) return false;
  // "Not now" is a SNOOZE, not a verdict. It used to write DONE_KEY, so one
  // dismissal — usually before the student had a parcel in flight, i.e. before
  // push had any value — silenced the prompt forever. Ask again in a week.
  const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
  if (snoozedAt > 0 && LOADED_AT - snoozedAt < SNOOZE_MS) return false;
  if (isNativeApp()) return true;
  return pushSupported() && Notification.permission !== "denied";
}

export default function PushOptIn() {
  const eligible = useSyncExternalStore(noopSubscribe, eligibleSnapshot, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const show = eligible && !dismissed;

  if (!show) return null;

  return (
    <div className="animate-fade-up flex flex-col gap-2 rounded-2xl border border-primary/30 bg-card p-3">
      <div className="flex items-center gap-3">
      <span className="text-xl">🔔</span>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        Get pinged the second someone claims your delivery — or drops it off.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const supabase = createClient();
            // These already return "subscribed" | "denied" | "unsupported" |
            // "failed" — the old code discarded it and treated every outcome as
            // success, writing DONE_KEY on a denial and never asking again.
            const status = isNativeApp()
              ? await ensureNativePushSubscription(supabase, "gaterunner")
              : await ensurePushSubscription(supabase, "gaterunner");
            if (status !== "subscribed") {
              setErr(
                status === "denied"
                  ? "Notifications are blocked for this site — turn them on in your browser settings, then tap Enable again."
                  : status === "unsupported"
                    ? "This browser can’t do notifications. Add GateRunner to your home screen, or use the app."
                    : "Couldn’t turn notifications on — try again."
              );
              setBusy(false);
              return;
            }
            localStorage.setItem(DONE_KEY, "1");
            setDismissed(true);
          } catch {
            setErr("Couldn’t turn notifications on — try again.");
            setBusy(false);
          }
        }}
        className="press min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable"}
      </button>
      <button
        aria-label="Not now"
        onClick={() => {
          // Snooze, not a verdict — see eligibleSnapshot.
          localStorage.setItem(SNOOZE_KEY, String(Date.now()));
          setDismissed(true);
        }}
        className="press min-h-11 shrink-0 px-1 text-muted-foreground"
      >
        ✕
      </button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
