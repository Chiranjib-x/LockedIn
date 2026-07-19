"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteCommunity, requestCommunityDeletion } from "./actions";

// Bottom-of-page danger controls. Only the app founder sees a real Delete
// button; a community's own leads can only request deletion.
export default function DeleteControls({
  cid,
  name,
  isFounder,
  isLead,
  requested,
  reason,
}: {
  cid: string;
  name: string;
  isFounder: boolean;
  isLead: boolean;
  requested: boolean;
  reason: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(requested);
  const [err, setErr] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [showReason, setShowReason] = useState(false);

  if (isFounder) {
    return (
      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-destructive">Danger zone</p>
        {requested && (
          <p className="text-xs text-muted-foreground">
            A lead requested deletion{reason ? `: “${reason}”` : "."}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => {
            if (!confirm(`Delete "${name}" permanently? Members, applications, meetings, achievements and all its data are erased. Its posts become ordinary board posts. This cannot be undone.`)) return;
            setBusy(true);
            deleteCommunity(cid); // server action redirects on success
          }}
          className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-destructive text-sm font-semibold text-on-destructive disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} /> {busy ? "Deleting…" : "Delete this community"}
        </button>
      </div>
    );
  }

  if (!isLead) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Need this taken down?</p>
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Deletion requested — the campus admin will review it. Only they can delete a community.
        </p>
      ) : showReason ? (
        <>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={2}
            placeholder="Why should this be deleted? (optional)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const msg = await requestCommunityDeletion(cid, reasonText);
                setBusy(false);
                if (msg) setErr(msg);
                else setSent(true);
              }}
              className="press min-h-10 flex-1 rounded-full bg-destructive text-sm font-semibold text-on-destructive disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send deletion request"}
            </button>
            <button onClick={() => setShowReason(false)} className="press min-h-10 rounded-full border border-border px-4 text-sm font-medium">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Leads can&rsquo;t delete communities — only the campus admin can. Send them a request.
          </p>
          <button
            onClick={() => setShowReason(true)}
            className="press flex w-fit items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Request deletion
          </button>
        </>
      )}
    </div>
  );
}
