"use client";

import { useState } from "react";
import { rsvpEvent, submitFeedback } from "./actions";

// RSVP toggle with live count; past capacity, new RSVPs are waitlisted (the
// list is first-come-first-served by created_at, shown to the organizer).
export function RsvpButton({
  postId,
  going,
  count,
  capacity,
}: {
  postId: string;
  going: boolean;
  count: number;
  capacity: number | null;
}) {
  const [isGoing, setIsGoing] = useState(going);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  const full = capacity != null && n >= capacity;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
      <div>
        <p className="text-sm font-semibold">
          {n} going{capacity != null && ` · ${capacity} seats`}
        </p>
        {full && !isGoing && (
          <p className="text-xs text-muted-foreground">Seats are full — you&rsquo;ll join the waitlist.</p>
        )}
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await rsvpEvent(postId, !isGoing);
          if (!err) {
            setN(n + (isGoing ? -1 : 1));
            setIsGoing(!isGoing);
          }
          setBusy(false);
        }}
        className={`press min-h-10 shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-50 ${
          isGoing
            ? "border border-accent/40 bg-accent/10 text-accent"
            : "bg-primary text-on-primary hover:bg-primary-strong"
        }`}
      >
        {busy ? "…" : isGoing ? "Going ✓ — tap to cancel" : full ? "Join waitlist" : "I'm going"}
      </button>
    </div>
  );
}

// One-shot post-event rating (RLS enforces after-event + once).
export function FeedbackForm({ postId }: { postId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  if (state === "done") {
    return <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">Thanks — feedback sent to the organizers. 🙌</p>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">How was it?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            aria-label={`${s} star${s > 1 ? "s" : ""}`}
            className={`press text-2xl ${s <= rating ? "" : "opacity-30 grayscale"}`}
          >
            ⭐
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Anything the organizers should know? (optional)"
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button
        disabled={state === "busy" || rating === 0}
        onClick={async () => {
          setState("busy");
          const e = await submitFeedback(postId, rating, comment);
          if (e) { setErr(e); setState("error"); } else setState("done");
        }}
        className="press min-h-10 rounded-full bg-primary text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        Send feedback
      </button>
    </div>
  );
}
