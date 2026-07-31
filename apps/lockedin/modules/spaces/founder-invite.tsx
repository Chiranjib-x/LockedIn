"use client";

import { useState } from "react";
import { createClient } from "@suite/auth/client";

// FINDINGS F7: the founder's bootstrap for an EMPTY space (0070). Deliberately
// mints an invite rather than adding someone directly — the person still opts
// in by redeeming, so nobody lands in a gendered members-only space without
// consent, and no student directory is browsed. Once someone redeems, the space
// is non-empty and normal member-vouches-member takes over.
export default function FounderInvite({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setErr(null);
    const { data, error } = await createClient().rpc("create_space_invite", { sid: spaceId });
    if (error) setErr(error.message.includes("not a member") ? "This space already has members — its own members invite from here on." : "Couldn't create the invite — try again.");
    else setLink(`${window.location.origin}/spaces/join/${data}`);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {link === null ? (
        <button
          disabled={busy}
          onClick={generate}
          className="press min-h-11 self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:opacity-50"
        >
          {busy ? "Creating…" : `Create founding invite`}
        </button>
      ) : (
        <>
          <p className="truncate rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{link}</p>
          <span className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // clipboard blocked — the link is on screen to copy manually
                }
              }}
              className="press flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${spaceName} on LockedIn — ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              WhatsApp
            </a>
          </span>
          <p className="text-xs text-muted-foreground">
            Send this to the student you want as the first member. It admits one person, expires in 7
            days, and after they join, members invite each other from inside.
          </p>
        </>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
