"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Getting a website visitor onto the installed app.
//
// The old version had three problems, and the first is the same bug the push
// opt-in had (POLISH J9-1): the ✕ wrote a permanent "dismissed" key, so one tap
// on day one — before the app had given anyone a reason — silenced it forever.
// Second, it only ever appeared when `beforeinstallprompt` fired, which is
// Chromium-only: iPhone users saw NOTHING, and iOS is exactly where installing
// matters most, because web push only works there once the app is on the home
// screen. Third, "one tap from lock screen to campus" is a convenience, not a
// reason — it never said what you actually get.
//
// So: snooze instead of silence, a manual path for iOS, and copy that names the
// thing the app can only do once installed.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SESSIONS_KEY = "li-pwa-sessions";
const SNOOZE_KEY = "li-pwa-snoozed";
const INSTALLED_KEY = "li-pwa-installed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// Read once per page load. useSyncExternalStore calls getSnapshot repeatedly
// during render, and a value that moves every call is how you get a render loop.
const LOADED_AT = Date.now();

// Count the session at MODULE scope, not in an effect. eligibleSnapshot() is
// read during the first render, and an effect runs after that — so counting in
// an effect meant the snapshot always saw the previous count, and with a no-op
// subscribe nothing ever re-read it. The card could therefore never appear on
// the session that first qualified. One increment per tab lifetime, guarded by
// sessionStorage, which is exactly "one per session".
if (typeof window !== "undefined") {
  try {
    if (sessionStorage.getItem(SESSIONS_KEY) === null) {
      const n = Number(localStorage.getItem(SESSIONS_KEY) ?? "0") + 1;
      localStorage.setItem(SESSIONS_KEY, String(n));
      sessionStorage.setItem(SESSIONS_KEY, "1");
    }
  } catch {
    // private mode / storage disabled — the card simply never shows
  }
}

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  // iOS Safari predates display-mode and exposes its own flag.
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent); // Chrome/FF on iOS can't install

const noopSubscribe = () => () => {};

/** Should this device be asked at all? Browser state, so it goes through
 *  useSyncExternalStore with a `false` server snapshot — this renders on the
 *  server, so a lazy initialiser would hydration-mismatch. */
function eligibleSnapshot() {
  if (typeof window === "undefined") return "no";
  if (localStorage.getItem(INSTALLED_KEY) !== null) return "no";
  if (isStandalone()) return "no"; // already installed — never nag
  const snoozed = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
  if (snoozed > 0 && LOADED_AT - snoozed < SNOOZE_MS) return "no";
  // Be polite: not on someone's very first visit.
  if (Number(localStorage.getItem(SESSIONS_KEY) ?? "0") < 2) return "no";
  return isIOS() ? "manual" : "auto";
}

export function InstallPrompt() {
  const mode = useSyncExternalStore(noopSubscribe, eligibleSnapshot, () => "no" as const);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [gone, setGone] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (mode !== "auto") return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Once installed, stop asking on this device for good.
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setGone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [mode]);

  if (gone || mode === "no") return null;
  // Chromium: nothing to show until the browser hands us the event.
  if (mode === "auto" && deferred === null) return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setGone(true);
  };

  return (
    <div className="animate-fade-up flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Get the app — you&rsquo;re missing alerts</p>
          <p className="text-xs text-muted-foreground">
            Installed, LockedIn can tell you the moment someone claims your parcel, replies to you,
            or a class is about to start. On the website it can&rsquo;t.
          </p>
        </div>
        <button
          aria-label="Not now"
          onClick={snooze}
          className="press min-h-11 min-w-11 shrink-0 text-muted-foreground"
        >
          ✕
        </button>
      </div>

      {mode === "auto" ? (
        <button
          onClick={async () => {
            await deferred!.prompt();
            const { outcome } = await deferred!.userChoice;
            if (outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
            else localStorage.setItem(SNOOZE_KEY, String(Date.now()));
            setGone(true);
          }}
          className="press inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          Add to home screen
        </button>
      ) : (
        // iOS has no install API — the only route is the Share sheet, so say so
        // rather than showing a button that cannot work.
        <>
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="press inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
          >
            {showSteps ? "Got it" : "Show me how (10 seconds)"}
          </button>
          {showSteps && (
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-muted-foreground">
              <li>
                Tap the <span className="font-medium text-foreground">Share</span> button at the
                bottom of Safari
              </li>
              <li>
                Scroll and tap{" "}
                <span className="font-medium text-foreground">Add to Home Screen</span>
              </li>
              <li>
                Tap <span className="font-medium text-foreground">Add</span> — then open LockedIn
                from your home screen and turn on notifications
              </li>
            </ol>
          )}
        </>
      )}
    </div>
  );
}
