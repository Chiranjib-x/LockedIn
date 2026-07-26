"use client";

import { useEffect, useState } from "react";

// Phase 20 PWA client glue: SW registration (mounted in the root layout) and
// the polite install card (mounted on /home). Session counting lives in
// localStorage; the card only appears from the 2nd session on and never
// returns once dismissed.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SESSIONS_KEY = "li-pwa-sessions";
const DISMISSED_KEY = "li-pwa-dismissed";

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

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) !== null) return;
    // Count one session per browser session (tab lifetime).
    let sessions = Number(localStorage.getItem(SESSIONS_KEY) ?? "0");
    if (sessionStorage.getItem(SESSIONS_KEY) === null) {
      sessions += 1;
      localStorage.setItem(SESSIONS_KEY, String(sessions));
      sessionStorage.setItem(SESSIONS_KEY, "1");
    }
    // Below the session threshold we simply never listen, so `deferred` stays
    // null and nothing renders — no separate `eligible` state needed (and no
    // synchronous setState in an effect body).
    if (sessions < 2) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (deferred === null) return null;

  return (
    <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Add LockedIn to your home screen</p>
        <p className="text-xs text-muted-foreground">One tap from lock screen to campus.</p>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="press min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
      >
        Install
      </button>
      <button
        aria-label="Dismiss install prompt"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setDeferred(null);
        }}
        className="press min-h-11 shrink-0 px-1 text-muted-foreground"
      >
        ✕
      </button>
    </div>
  );
}
