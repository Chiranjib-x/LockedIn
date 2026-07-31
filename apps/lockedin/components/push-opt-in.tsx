"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ensureNativePushSubscription,
  ensurePushSubscription,
  isNativeApp,
  pushSupported,
} from "@/lib/push/client";

const DONE_KEY = "li-push-optin-done";
const SNOOZE_KEY = "li-push-optin-snoozed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// Captured once per page load, deliberately NOT read inside the snapshot:
// useSyncExternalStore calls getSnapshot repeatedly during render, and a value
// that moves on every call is how you get a render loop. Re-asking one page load
// later is exactly the granularity we want anyway.
const LOADED_AT = Date.now();

// NOTE: this is Record<string, string>, so an unknown key TYPECHECKS and then
// renders an empty line. Add the key here whenever you add a <PushOptIn context>.
const CONTEXT_COPY: Record<string, string> = {
  chats: "Get pinged the moment someone replies — even with the app closed.",
  timetable: "Get a heads-up 30 minutes before a class you can’t afford to bunk.",
  gate: "Get pinged when someone needs a parcel run — and when yours is on its way.",
  // LIVELY L6. Asked on the just-posted listing page, which is the one moment a
  // seller has something to gain: they want to know the second someone bites.
  // 4 of 143 students had push on, which is most of why nobody comes back.
  listing: "Get told the moment someone makes an offer — even with the app closed.",
};

// Contextual permission ask (never on load): a dismissible card mounted on
// the pages where push has obvious value. One decision, remembered forever.
// Whether this device should be asked at all — browser state, so it is read via
// useSyncExternalStore rather than an effect. The server snapshot is `false`,
// which avoids a hydration mismatch (this card DOES render on the server) and
// keeps setState out of an effect body. Nothing external emits changes.
const noopSubscribe = () => () => {};
function eligibleSnapshot() {
  // DONE means the student actually enabled push. Only success writes it.
  if (localStorage.getItem(DONE_KEY) !== null) return false;
  // "Not now" is a SNOOZE, not a verdict. It used to write DONE_KEY, so a single
  // dismissal — usually on day one, before you have any chats, parcels or
  // classes and therefore before push has any value — silenced the prompt on
  // every page forever. Ask again in a week, once the app has a reason.
  const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
  if (snoozedAt > 0 && LOADED_AT - snoozedAt < SNOOZE_MS) return false;
  if (isNativeApp()) return true; // native FCM path — web Notification API absent here
  return pushSupported() && Notification.permission !== "denied";
}

export default function PushOptIn({ context }: { context: keyof typeof CONTEXT_COPY }) {
  const eligible = useSyncExternalStore(noopSubscribe, eligibleSnapshot, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!eligible || dismissed) return null;

  return (
    <div className="animate-fade-up flex flex-col gap-2 rounded-2xl border border-primary/30 bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔔</span>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{CONTEXT_COPY[context]}</p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const supabase = createClient();
              // These already return "subscribed" | "denied" | "unsupported" |
              // "failed" — the old code discarded it and treated every outcome
              // as success. Only a real subscription counts as "decided";
              // writing DONE_KEY on a denial recorded the failure as a finished
              // choice and never asked again, which is how you end up with 1
              // push subscription across 18 students.
              const status = isNativeApp()
                ? await ensureNativePushSubscription(supabase)
                : await ensurePushSubscription(supabase);
              if (status !== "subscribed") {
                setErr(
                  status === "denied"
                    ? "Notifications are blocked for this site — turn them on in your browser settings, then tap Enable again."
                    : status === "unsupported"
                      ? "This browser can’t do notifications. Add LockedIn to your home screen, or use the app."
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
