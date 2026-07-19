"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fileReport, blockUser } from "./actions";

const REASONS = ["Scam or fraud", "Inappropriate content", "Harassment", "Spam", "Wrong / misleading", "Other"];

// Reusable report action. Renders a small "⋯" trigger that opens a sheet with a
// reason picker; if the target has an author, also offers Block. Accessible:
// dialog role, Escape to close, autofocus, return-focus to the trigger.
export default function ReportSheet({
  targetType,
  targetId,
  authorId,
  compact = false,
}: {
  targetType: "user" | "listing" | "post" | "group_order" | "subscription" | "request";
  targetId: string;
  authorId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus(); // return focus to the trigger
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label="Report or block"
        aria-haspopup="dialog"
        className={`press text-muted-foreground hover:text-foreground ${compact ? "text-sm" : "text-lg"}`}
      >
        ⋯
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-sheet-title"
            className="animate-sheet-up glass w-full max-w-lg rounded-t-3xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-3xl">✅</span>
                <p className="font-medium">{done}</p>
                <button onClick={() => { close(); router.refresh(); }} className="press mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 id="report-sheet-title" className="mb-3 text-lg font-semibold">Report this</h2>
                <div className="flex flex-col gap-1.5">
                  {REASONS.map((r, i) => (
                    <button
                      key={r}
                      ref={i === 0 ? firstItemRef : undefined}
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
                <button onClick={close} className="mt-3 min-h-11 w-full text-center text-sm text-muted-foreground">
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
