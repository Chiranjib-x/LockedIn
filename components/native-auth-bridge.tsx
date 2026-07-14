"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// In the installed app, Google OAuth runs in a Chrome Custom Tab (Google blocks
// embedded webviews) and redirects back via the com.lockedin.campus:// deep
// link. This listener catches that redirect, exchanges the code for a session
// (the PKCE verifier is in this webview's storage), closes the tab, and lands
// home. No-op on the web, where /auth/callback handles it. Dynamic imports keep
// the Capacitor plugins out of SSR.
export default function NativeAuthBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");
      const supabase = createClient();
      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        try {
          const code = new URL(url).searchParams.get("code");
          if (!code) return;
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          await Browser.close().catch(() => {});
          if (!error) window.location.href = "/home";
        } catch {
          /* ignore malformed deep links */
        }
      });
      cleanup = () => handle.remove();
    })();
    return () => cleanup?.();
  }, []);
  return null;
}
