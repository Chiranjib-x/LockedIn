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

const CONTEXT_COPY: Record<string, string> = {
  chats: "Get pinged the moment someone replies — even with the app closed.",
  timetable: "Get a heads-up 30 minutes before a class you can’t afford to bunk.",
};

// Contextual permission ask (never on load): a dismissible card mounted on
// the pages where push has obvious value. One decision, remembered forever.
// Whether this device should be asked at all — browser state, so it is read via
// useSyncExternalStore rather than an effect. The server snapshot is `false`,
// which avoids a hydration mismatch (this card DOES render on the server) and
// keeps setState out of an effect body. Nothing external emits changes.
const noopSubscribe = () => () => {};
function eligibleSnapshot() {
  if (localStorage.getItem(DONE_KEY) !== null) return false;
  if (isNativeApp()) return true; // native FCM path — web Notification API absent here
  return pushSupported() && Notification.permission !== "denied";
}

export default function PushOptIn({ context }: { context: keyof typeof CONTEXT_COPY }) {
  const eligible = useSyncExternalStore(noopSubscribe, eligibleSnapshot, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!eligible || dismissed) return null;

  return (
    <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3">
      <span className="text-xl">🔔</span>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{CONTEXT_COPY[context]}</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const supabase = createClient();
          if (isNativeApp()) await ensureNativePushSubscription(supabase);
          else await ensurePushSubscription(supabase);
          localStorage.setItem(DONE_KEY, "1");
          setDismissed(true);
        }}
        className="press min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable"}
      </button>
      <button
        aria-label="Not now"
        onClick={() => {
          localStorage.setItem(DONE_KEY, "1");
          setDismissed(true);
        }}
        className="press min-h-11 shrink-0 px-1 text-muted-foreground"
      >
        ✕
      </button>
    </div>
  );
}
