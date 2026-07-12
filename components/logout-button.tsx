"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push/client";

// Lives on the Profile page (moved out of the header in the visual refresh).
// Logout must unsubscribe push FIRST — endpoint rows are user-scoped but the
// device keeps receiving until the row dies (shared-phone leak otherwise).
export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await disablePush(createClient());
        await logout();
      }}
      className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
