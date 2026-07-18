"use client";

import { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import { useRefresh } from "@/lib/use-refresh";
import { addBox, deleteBox, addBoxItem, adjustBoxItem, deleteBoxItem } from "./actions";

type Item = { id: string; name: string; quantity: number };
type Box = { id: string; name: string; items: Item[] };

// Box management — named containers, each holding a list of items with a
// quantity the leads bump up/down as they take out or put in. Separate from
// the flat inventory. Members see the contents; leads manage them.
export default function Boxes({ cid, isLead, boxes }: { cid: string; isLead: boolean; boxes: Box[] }) {
  const refresh = useRefresh();
  const [newBox, setNewBox] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isLead && boxes.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Package className="h-5 w-5 text-primary" strokeWidth={2} /> Boxes
      </h2>

      {isLead && (
        <div className="flex gap-2 rounded-2xl border border-border bg-card p-3">
          <input
            value={newBox}
            onChange={(e) => setNewBox(e.target.value)}
            placeholder="New box name (e.g. Robotics kit)"
            className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <button
            disabled={busy || !newBox.trim()}
            onClick={async () => { setBusy(true); setErr(await addBox(cid, newBox)); setNewBox(""); setBusy(false); refresh(); }}
            className="press shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Add box
          </button>
        </div>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}

      {boxes.map((box) => (
        <BoxCard key={box.id} cid={cid} isLead={isLead} box={box} onChange={refresh} />
      ))}
    </section>
  );
}

function BoxCard({ cid, isLead, box, onChange }: { cid: string; isLead: boolean; box: Box; onChange: () => void }) {
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const totalUnits = box.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-semibold">
          📦 {box.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {box.items.length} item{box.items.length === 1 ? "" : "s"} · {totalUnits} unit{totalUnits === 1 ? "" : "s"}
          </span>
        </p>
        {isLead && (
          <button
            onClick={async () => { if (confirm(`Delete the "${box.name}" box and its contents?`)) { await deleteBox(box.id, cid); onChange(); } }}
            className="press shrink-0 text-xs text-destructive"
          >
            Delete box
          </button>
        )}
      </div>

      {box.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Empty — {isLead ? "add what's inside below." : "nothing listed yet."}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {box.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">{it.name}</span>
              {isLead ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={async () => { await adjustBoxItem(it.id, cid, -1); onChange(); }}
                    aria-label="Take one out"
                    className="press flex h-7 w-7 items-center justify-center rounded-full border border-border disabled:opacity-40"
                    disabled={it.quantity === 0}
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <span className={`w-6 text-center font-heading font-bold ${it.quantity === 0 ? "text-destructive" : ""}`}>{it.quantity}</span>
                  <button
                    onClick={async () => { await adjustBoxItem(it.id, cid, 1); onChange(); }}
                    aria-label="Put one in"
                    className="press flex h-7 w-7 items-center justify-center rounded-full border border-border"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <button
                    onClick={async () => { await deleteBoxItem(it.id, cid); onChange(); }}
                    aria-label="Remove item"
                    className="press ml-1 shrink-0 text-xs text-destructive"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span className={`shrink-0 rounded-full bg-card px-2 py-0.5 text-xs font-semibold ${it.quantity === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  ×{it.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isLead && (
        <div className="flex gap-2">
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Item name"
            className="min-h-9 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="min-h-9 w-16 rounded-xl border border-border bg-background px-2 text-sm"
          />
          <button
            disabled={busy || !item.trim()}
            onClick={async () => { setBusy(true); await addBoxItem(box.id, cid, item, Number(qty)); setItem(""); setQty("1"); setBusy(false); onChange(); }}
            className="press shrink-0 rounded-full border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
