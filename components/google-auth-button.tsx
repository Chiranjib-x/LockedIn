"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Flip to true only AFTER enabling the Google provider in the Supabase
// dashboard (Auth → Providers → Google, with a Client ID/Secret from Google
// Cloud). Until then the button hits "provider is not enabled", so it's hidden.
const GOOGLE_ENABLED = true;

// College-domain gate is enforced server-side by the handle_new_user trigger
// (migration 0036) regardless of provider, so no extra tenancy check needed here.
// Includes its own "or" divider so hiding the button leaves nothing dangling.
export default function GoogleAuthButton() {
  const [busy, setBusy] = useState(false);
  if (!GOOGLE_ENABLED) return null;
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const supabase = createClient();
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) setBusy(false);
        }}
        className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
      >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
    </>
  );
}
