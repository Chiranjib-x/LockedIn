"use client";

import { useState } from "react";
import { addQuestion, removeQuestion } from "./actions";

// Lead-only editor for the application form. Zero questions = instant join;
// one or more = joining goes through apply -> review.
export default function QuestionsEditor({
  cid,
  questions,
}: {
  cid: string;
  questions: { id: string; prompt: string }[];
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">Application questions</p>
      <p className="text-xs text-muted-foreground">
        {questions.length === 0
          ? "None — anyone can join instantly. Add a question to switch to apply-and-review."
          : "Joining requires answering these; you review every application."}
      </p>
      {questions.map((q) => (
        <div key={q.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">{q.prompt}</span>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await removeQuestion(q.id, cid); setBusy(false); }}
            className="press shrink-0 text-xs font-medium text-destructive disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Why do you want to join?"
          className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
        />
        <button
          disabled={busy || !draft.trim()}
          onClick={async () => {
            setBusy(true);
            setErr(await addQuestion(cid, draft));
            setDraft("");
            setBusy(false);
          }}
          className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
