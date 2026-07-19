"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { submitRating } from "./actions";

export default function RateForm({
  transactionId,
  rateeId,
  rateeName,
}: {
  transactionId: string;
  rateeId: string;
  rateeName: string;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="animate-scale-in flex flex-col items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center">
        <span className="text-3xl">✅</span>
        <p className="font-medium">Thanks — your rating for {rateeName} is in.</p>
        <button onClick={() => router.push("/home")} className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            className="press text-4xl"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <span className={n <= (hover || stars) ? "text-amber-500" : "text-muted-foreground/30"}>★</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={`How was dealing with ${rateeName}? (optional)`}
        className={inputClass}
      />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        disabled={busy || stars === 0}
        onClick={async () => {
          setBusy(true);
          const e = await submitRating(transactionId, rateeId, stars, comment);
          setBusy(false);
          if (e) setErr(e);
          else setDone(true);
        }}
        className="press min-h-12 rounded-full bg-primary px-6 font-semibold text-on-primary disabled:opacity-50"
      >
        {busy ? "Submitting…" : stars === 0 ? "Pick a rating" : "Submit rating"}
      </button>
    </div>
  );
}
