"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import BarcodeScanner from "./scanner";
import { recordCheckin } from "./actions";

type Row = { code: string; name: string | null };

export default function CheckinClient({ postId, initial }: { postId: string; initial: Row[] }) {
  const [roster, setRoster] = useState<Row[]>(initial);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(code: string) {
    if (busy) return; // dropped scans re-fire from the camera within ~2.5s
    setBusy(true);
    const res = await recordCheckin(postId, code);
    setBusy(false);
    if (res.error) return setFlash({ msg: res.error, ok: false });
    const who = res.attendee_name ?? code;
    if (res.is_new) {
      setRoster((r) => [{ code, name: res.attendee_name }, ...r]);
      setFlash({ msg: `✓ ${who} checked in`, ok: true });
    } else {
      setFlash({ msg: `${who} is already checked in`, ok: true });
    }
    setTimeout(() => setFlash(null), 2500);
  }

  return (
    <div className="flex flex-col gap-4">
      <BarcodeScanner onScan={handle} />

      {flash && (
        <p
          className={`rounded-xl border p-3 text-sm font-medium ${
            flash.ok
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="status"
        >
          {flash.msg}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserCheck className="h-5 w-5 text-primary" strokeWidth={2} />
          Checked in · {roster.length}
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">Scan an ID card to check someone in.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {roster.map((r) => (
              <li key={r.code} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{r.name ?? r.code}</span>
                {!r.name && <span className="text-xs text-muted-foreground">guest · {r.code}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
