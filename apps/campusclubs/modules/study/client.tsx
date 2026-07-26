"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createGroup, joinGroup, leaveGroup } from "./actions";

export function CreateGroupForm({ error }: { error?: string }) {
  const [open, setOpen] = useState(!!error);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex min-h-11 items-center justify-center rounded-full border border-dashed border-border text-sm font-semibold text-muted-foreground hover:bg-muted"
      >
        ＋ Start a study group
      </button>
    );
  }
  return (
    <form action={createGroup} className="animate-scale-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Course code
          <input name="course_code" required placeholder="e.g. CSE3006" className={inputClass} />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm font-medium">
          Capacity
          <input name="capacity" type="number" min={2} max={50} defaultValue={6} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" required placeholder="e.g. DBMS end-sem grind" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Meets (optional)
        <input name="meet_info" placeholder="e.g. Library 3rd floor, Tue/Thu 7pm" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        What&rsquo;s the plan?
        <textarea name="description" rows={2} placeholder="PYQs, notes swap, doubt-clearing…" className={inputClass} />
      </label>
      <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="text-left text-xs text-muted-foreground hover:underline">
        Cancel
      </button>
    </form>
  );
}

export function JoinLeaveButton({
  gid,
  isMember,
  isFull,
  chatId,
}: {
  gid: string;
  isMember: boolean;
  isFull: boolean;
  chatId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (isMember) {
    return (
      <span className="flex items-center gap-2">
        {chatId != null && (
          <button
            onClick={() => router.push(`/chats/${chatId}`)}
            className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary"
          >
            Group chat 💬
          </button>
        )}
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirm("Leave this group?")) return;
            setBusy(true);
            await leaveGroup(gid);
            router.refresh();
            setBusy(false);
          }}
          className="press rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
        >
          Leave
        </button>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        disabled={busy || isFull}
        onClick={async () => {
          setBusy(true);
          const e = await joinGroup(gid);
          setErr(e);
          if (e == null) router.refresh();
          setBusy(false);
        }}
        className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {isFull ? "Full" : busy ? "Joining…" : "Join"}
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </span>
  );
}
