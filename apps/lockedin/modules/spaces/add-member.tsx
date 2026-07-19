"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Sealed vouching (0027): a member generates a single-use invite link and
// shares it out-of-band. Replaces the old search-profiles-by-name flow —
// vouching never needed a browsable directory.
export default function AddMember({ spaceId }: { spaceId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("create_space_invite", { sid: spaceId });
    if (error) setErr("Couldn't create an invite — try again.");
    else setLink(`${window.location.origin}/spaces/join/${data}`);
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        ＋ Invite someone you trust
      </button>
    );
  }

  return (
    <div className="animate-scale-in flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">
        The link admits one person and dies in 7 days. Only share it with someone who belongs here —
        you’re vouching for them.
      </p>
      {link === null ? (
        <button
          disabled={busy}
          onClick={generate}
          className="press min-h-11 self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create invite link"}
        </button>
      ) : (
        <>
          <p className="truncate rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{link}</p>
          <span className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You’re invited — ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              WhatsApp
            </a>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // clipboard unavailable — the link is visible to copy manually
                }
              }}
              className="press flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button
              onClick={() => setLink(null)}
              className="press flex min-h-11 items-center px-2 text-xs text-muted-foreground hover:underline"
            >
              New link
            </button>
          </span>
        </>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button onClick={() => setOpen(false)} className="text-left text-xs text-muted-foreground hover:underline">
        Close
      </button>
    </div>
  );
}
