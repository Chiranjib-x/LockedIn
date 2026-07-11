"use client";

import { useState } from "react";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push/client";

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
      className="flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {busy ? "…" : "Log out"}
    </button>
  );
}
