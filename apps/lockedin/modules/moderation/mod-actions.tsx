"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import { dismissReport, removeContent, banUser } from "./actions";

// FINDINGS F41: these buttons fired and discarded the result, so a failed
// moderation action looked exactly like a successful one. Same busy/error
// wrapper as GateRunner's pickup buttons: disabled while in flight (no
// double-ban on a slow connection) and the failure shown inline.
function ActionButton({
  run,
  className,
  confirmText,
  children,
}: {
  run: () => Promise<string | null | undefined>;
  className: string;
  confirmText?: string;
  children: React.ReactNode;
}) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          if (confirmText && !confirm(confirmText)) return;
          setBusy(true);
          setErr(null);
          const e = await run();
          setBusy(false);
          if (e) setErr(e);
          else refresh();
        }}
        className={`${className} disabled:opacity-50`}
      >
        {busy ? "…" : children}
      </button>
      {err && (
        <p className="w-full text-xs text-destructive" role="alert">
          {err}
        </p>
      )}
    </>
  );
}

export function ReportActions({
  reportId,
  targetType,
  targetId,
  authorId,
}: {
  reportId: string;
  targetType: string;
  targetId: string;
  authorId: string | null;
}) {
  const removable =
    targetType === "listing" || targetType === "post" || targetType === "group_order" || targetType === "request";
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <ActionButton
        run={() => dismissReport(reportId)}
        className="press min-h-11 rounded-full border border-border px-4 font-medium hover:bg-muted"
      >
        Dismiss
      </ActionButton>
      {removable && (
        <ActionButton
          run={() =>
            removeContent(reportId, targetType as "listing" | "post" | "group_order" | "request", targetId)
          }
          confirmText="Remove this content? The author is notified."
          className="press min-h-11 rounded-full border border-destructive/40 px-4 font-medium text-destructive hover:bg-destructive/10"
        >
          Remove content
        </ActionButton>
      )}
      {authorId && (
        <ActionButton
          run={() => banUser(reportId, authorId)}
          confirmText="Ban this user? They can log in but can’t post or message."
          className="press min-h-11 rounded-full bg-destructive px-4 font-semibold text-on-destructive"
        >
          Ban user
        </ActionButton>
      )}
    </div>
  );
}
