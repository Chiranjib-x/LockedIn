"use client";

import { connect } from "./actions";
import { useState } from "react";

export default function ConnectButton({
  targetId,
  state,
}: {
  targetId: string;
  state: "none" | "sent" | "incoming" | "mutual";
}) {
  const [busy, setBusy] = useState(false);

  if (state === "mutual") {
    return <span className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">Connected ✓</span>;
  }
  if (state === "sent") {
    return <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">Requested</span>;
  }
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await connect(targetId);
        setBusy(false);
      }}
      className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
    >
      {state === "incoming" ? "Accept ✓" : "Connect"}
    </button>
  );
}
