"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { useRefresh } from "@suite/lib/use-refresh";
import { submitClaim, decideClaim } from "./actions";

// Phase 30 claim flow. Answers are private (RLS: claimant + post author only).

export function ThisIsMine({
  postId,
  question,
  myClaimStatus,
}: {
  postId: string;
  question: string | null;
  myClaimStatus: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (myClaimStatus === "pending" || state === "sent") {
    return <p className="text-sm text-muted-foreground">Claim sent — the finder will review it. 🤞</p>;
  }
  if (myClaimStatus === "accepted") {
    return <p className="text-sm font-medium text-accent">Your claim was accepted — check your chats.</p>;
  }
  if (myClaimStatus === "rejected") {
    return <p className="text-sm text-muted-foreground">Your claim wasn’t accepted this time.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        This is mine
      </button>
    );
  }
  return (
    <div className="animate-scale-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-medium">
        {question ?? "Describe something only the owner would know:"}
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder="Your answer — only the finder sees this"
        className={inputClass}
      />
      {state && <p className="text-sm text-destructive">{state}</p>}
      <button
        disabled={busy || answer.trim() === ""}
        onClick={async () => {
          setBusy(true);
          const err = await submitClaim(postId, answer);
          setState(err ?? "sent");
          setBusy(false);
        }}
        className="press min-h-11 self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send claim"}
      </button>
    </div>
  );
}

export function ClaimsPanel({
  postId,
  claims,
}: {
  postId: string;
  claims: { id: string; answer: string; status: string; claimant: string }[];
}) {
  const refresh = useRefresh();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (claims.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <h2 className="text-sm font-semibold">Claims — only you can see these</h2>
      {claims.map((c) => (
        <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <p className="text-sm">
            <span className="font-medium">{c.claimant}:</span> {c.answer}
          </p>
          {c.status === "pending" ? (
            <span className="flex gap-2">
              <button
                disabled={busyId === c.id}
                onClick={async () => {
                  setBusyId(c.id);
                  await decideClaim(c.id, postId, true);
                  refresh();
                }}
                className="press min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50"
              >
                Accept — it’s theirs
              </button>
              <button
                disabled={busyId === c.id}
                onClick={async () => {
                  setBusyId(c.id);
                  await decideClaim(c.id, postId, false);
                  setBusyId(null);
                  refresh();
                }}
                className="press min-h-11 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground"
              >
                Not them
              </button>
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">{c.status}</p>
          )}
        </div>
      ))}
    </section>
  );
}
