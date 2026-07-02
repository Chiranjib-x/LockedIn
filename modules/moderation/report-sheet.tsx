"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fileReport, blockUser } from "./actions";

const REASONS = ["Scam or fraud", "Inappropriate content", "Harassment", "Spam", "Wrong / misleading", "Other"];

// Reusable report action. Renders a small "⋯" trigger that opens a sheet with a
// reason picker; if the target has an author, also offers Block.
export default function ReportSheet({
  targetType,
  targetId,
  authorId,
  compact = false,
}: {
  targetType: "user" | "listing" | "post" | "group_order" | "subscription";
  targetId: string;
  authorId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Report or block"
        className={`press text-muted-foreground hover:text-foreground ${compact ? "text-sm" : "text-lg"}`}
      >
        ⋯
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" onClick={() => setOpen(false)}>
          <div
            className="animate-sheet-up glass w-full max-w-lg rounded-t-3xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-3xl">✅</span>
                <p className="font-medium">{done}</p>
                <button onClick={() => { setOpen(false); router.refresh(); }} className="press mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-semibold">Report this</h2>
                <div className="flex flex-col gap-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const err = await fileReport(targetType, targetId, r);
                        setBusy(false);
                        setDone(err ? "Something went wrong." : "Reported. Our moderators will review it.");
                      }}
                      className="press rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium hover:bg-muted"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {authorId && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const err = await blockUser(authorId);
                      setBusy(false);
                      setDone(err ?? "Blocked. You won’t see their content anymore.");
                    }}
                    className="press mt-3 w-full rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Block this person
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="mt-3 w-full text-center text-sm text-muted-foreground">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
