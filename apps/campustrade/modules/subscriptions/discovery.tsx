"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { useRefresh } from "@suite/lib/use-refresh";
import { setDiscoverable, requestJoin, decideJoin } from "./actions";

export function DiscoverToggle({
  subId,
  discoverable,
  openSeats,
}: {
  subId: string;
  discoverable: boolean;
  openSeats: number;
}) {
  const refresh = useRefresh();
  const [seats, setSeats] = useState(openSeats > 0 ? openSeats : 1);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
      {discoverable ? (
        <>
          <span className="font-medium">🌐 Listed on the browse board · {openSeats} open seat{openSeats === 1 ? "" : "s"}</span>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await setDiscoverable(subId, false, 0); setBusy(false); refresh(); }}
            className="press rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            Unlist
          </button>
        </>
      ) : (
        <>
          <span className="font-medium">Open seats to the campus:</span>
          <input
            aria-label="Seats"
            type="number" min={1} max={20} value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className={`${inputClass} w-20`}
          />
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await setDiscoverable(subId, true, seats); setBusy(false); refresh(); }}
            className="press rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary"
          >
            {busy ? "Listing…" : "List pool"}
          </button>
        </>
      )}
    </div>
  );
}

export function RequestJoin({ subId, alreadyAsked }: { subId: string; alreadyAsked: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<string | null>(alreadyAsked ? "sent" : null);
  const [busy, setBusy] = useState(false);

  if (state === "sent") {
    return <p className="text-sm text-muted-foreground">Request sent — the owner will decide. 🤞</p>;
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
      >
        Request a seat
      </button>
    );
  }
  return (
    <div className="animate-scale-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <textarea aria-label="A line about you (optional) — e.g. hostel, batch, always pays on time"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="A line about you (optional) — e.g. hostel, batch, always pays on time"
        className={inputClass}
      />
      {state && state !== "sent" && <p className="text-sm text-destructive">{state}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await requestJoin(subId, note);
          setState(err ?? "sent");
          setBusy(false);
        }}
        className="press min-h-11 self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send request"}
      </button>
    </div>
  );
}

export function JoinRequestsPanel({
  requests,
}: {
  requests: { id: string; note: string | null; requester: string }[];
}) {
  const refresh = useRefresh();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <h2 className="text-sm font-semibold">Seat requests</h2>
      {requests.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <p className="text-sm">
            <span className="font-medium">{r.requester}</span>
            {r.note && <span className="text-muted-foreground"> — {r.note}</span>}
          </p>
          <span className="flex gap-2">
            <button
              disabled={busyId === r.id}
              onClick={async () => { setBusyId(r.id); await decideJoin(r.id, true); refresh(); }}
              className="press min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50"
            >
              Approve (prorated)
            </button>
            <button
              disabled={busyId === r.id}
              onClick={async () => { setBusyId(r.id); await decideJoin(r.id, false); setBusyId(null); refresh(); }}
              className="press min-h-11 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground"
            >
              Decline
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}
