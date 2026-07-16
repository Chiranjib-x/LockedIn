"use client";

import { connect, messageMatch } from "./actions";
import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";

export default function ConnectButton({
  targetId,
  state,
}: {
  targetId: string;
  state: "none" | "sent" | "incoming" | "mutual";
}) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);

  if (state === "mutual") {
    return (
      <button
        onClick={() => messageMatch(targetId)}
        className="press rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-on-accent"
      >
        Message 💬
      </button>
    );
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
        refresh();
      }}
      className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
    >
      {state === "incoming" ? "Accept & chat ✓" : "Connect"}
    </button>
  );
}
