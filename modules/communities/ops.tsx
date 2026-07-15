"use client";

import { useState } from "react";
import {
  addTask, setTaskStatus, deleteTask,
  addResource, deleteResource,
  addInventory, setInventoryHolder, deleteInventory,
} from "./actions";

type Member = { user_id: string; name: string };
type Task = { id: string; title: string; assignee_id: string | null; due_date: string | null; status: string };
type Resource = { id: string; label: string; url: string };
type Inv = { id: string; item: string; holder_id: string | null; note: string | null };

const nameById = (members: Member[], id: string | null) =>
  id ? members.find((m) => m.user_id === id)?.name ?? "Someone" : null;

// Task board — leads assign with a due date; the assignee (or a lead) ticks
// it done. Members see the whole board.
export function TaskBoard({ cid, isLead, tasks, members }: { cid: string; isLead: boolean; tasks: Task[]; members: Member[] }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">✅ Task board</h2>
      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design the poster"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
          <div className="flex gap-2">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-2 text-sm">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
              className="min-h-10 rounded-xl border border-border bg-background px-2 text-sm" />
            <button disabled={busy || !title.trim()}
              onClick={async () => { setBusy(true); setErr(await addTask(cid, title, assignee, due)); setTitle(""); setAssignee(""); setDue(""); setBusy(false); }}
              className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">Add</button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
      {open.length === 0 && done.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
      {open.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <button
            onClick={() => setTaskStatus(t.id, cid, true)}
            aria-label="Mark done"
            className="press h-5 w-5 shrink-0 rounded-full border-2 border-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {nameById(members, t.assignee_id) ?? "Unassigned"}
              {t.due_date && ` · due ${new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`}
            </p>
          </div>
          {isLead && <button onClick={() => deleteTask(t.id, cid)} className="press shrink-0 text-xs text-destructive">✕</button>}
        </div>
      ))}
      {done.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3">
          <button onClick={() => setTaskStatus(t.id, cid, false)} aria-label="Reopen"
            className="press flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-on-accent">✓</button>
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">{t.title}</p>
          {isLead && <button onClick={() => deleteTask(t.id, cid)} className="press shrink-0 text-xs text-destructive">✕</button>}
        </div>
      ))}
    </section>
  );
}

// Pinned resources — a links shelf (drive folders, rulebooks, playlists).
export function Resources({ cid, isLead, resources }: { cid: string; isLead: boolean; resources: Resource[] }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isLead && resources.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">📌 Resources</h2>
      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label"
              className="min-h-10 w-1/3 rounded-xl border border-border bg-background px-3 text-sm" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link"
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
            <button disabled={busy || !label.trim() || !url.trim()}
              onClick={async () => { setBusy(true); setErr(await addResource(cid, label, url)); setLabel(""); setUrl(""); setBusy(false); }}
              className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">Pin</button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
      {resources.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="press min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline">
            🔗 {r.label}
          </a>
          {isLead && <button onClick={() => deleteResource(r.id, cid)} className="press shrink-0 text-xs text-destructive">✕</button>}
        </div>
      ))}
    </section>
  );
}

// Inventory register — team gear and who currently holds it.
export function Inventory({ cid, isLead, items, members }: { cid: string; isLead: boolean; items: Inv[]; members: Member[] }) {
  const [item, setItem] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isLead && items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">📦 Inventory</h2>
      {isLead && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex gap-2">
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item (e.g. DSLR camera)"
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
              className="min-h-10 w-1/3 rounded-xl border border-border bg-background px-3 text-sm" />
            <button disabled={busy || !item.trim()}
              onClick={async () => { setBusy(true); setErr(await addInventory(cid, item, note)); setItem(""); setNote(""); setBusy(false); }}
              className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">Add</button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{it.item}</p>
            {it.note && <p className="truncate text-xs text-muted-foreground">{it.note}</p>}
          </div>
          {isLead ? (
            <select
              value={it.holder_id ?? ""}
              onChange={(e) => setInventoryHolder(it.id, cid, e.target.value)}
              className="min-h-9 shrink-0 rounded-full border border-border bg-background px-2 text-xs"
            >
              <option value="">In store</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
              {nameById(members, it.holder_id) ?? "In store"}
            </span>
          )}
          {isLead && <button onClick={() => deleteInventory(it.id, cid)} className="press shrink-0 text-xs text-destructive">✕</button>}
        </div>
      ))}
    </section>
  );
}
