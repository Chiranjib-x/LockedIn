"use client";

import { useState } from "react";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import { addEntry, deleteEntry } from "./actions";
import { DAY_NAMES } from "./helpers";

export function AddClassForm({ error }: { error?: string }) {
  const [open, setOpen] = useState(!!error);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex min-h-11 items-center justify-center rounded-full border border-dashed border-border text-sm font-semibold text-muted-foreground hover:bg-muted"
      >
        ＋ Add a class
      </button>
    );
  }

  return (
    <form action={addEntry} className="animate-scale-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Day
          <select name="day_of_week" defaultValue={new Date().getDay()} className={inputClass}>
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Starts
          <input name="starts_at" type="time" required className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Ends
          <input name="ends_at" type="time" required className={inputClass} />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Course code
          <input name="course_code" required placeholder="e.g. CSE3006" className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Venue
          <input name="venue" placeholder="e.g. SJT-403" className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" required placeholder="e.g. DBMS Lab" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Attendance threshold override % <span className="font-normal text-muted-foreground">optional</span>
        <input name="min_attendance" type="number" min={0} max={100} placeholder="defaults to your college's 75%" className={inputClass} />
      </label>
      <div className="flex gap-2">
        <SubmitButton pendingLabel="Adding…">Add class</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="press rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  return (
    <button
      onClick={() => { if (confirm("Remove this class from your timetable?")) deleteEntry(id); }}
      aria-label="Remove class"
      className="press flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
    >
      ✕
    </button>
  );
}
