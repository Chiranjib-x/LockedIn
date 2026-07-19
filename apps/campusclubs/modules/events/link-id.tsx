"use client";

import { useState } from "react";
import { ScanLine, Check } from "lucide-react";
import BarcodeScanner from "./scanner";
import { linkMyId, unlinkMyId } from "./actions";

// Scan-to-link your own ID card. Scanning (not typing) is what makes check-in
// recognise you: the stored value equals the exact barcode string an organizer
// later scans. Reuses the same scanner as the check-in door.
export default function LinkId({ linked }: { linked: boolean }) {
  const [isLinked, setIsLinked] = useState(linked);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function onScan(code: string) {
    if (busy) return;
    setBusy(true);
    const res = await linkMyId(code);
    setBusy(false);
    if (res.ok) {
      setIsLinked(true);
      setScanning(false);
      setMsg({ text: "ID linked — you’ll show up by name at event check-ins.", ok: true });
    } else {
      setMsg({ text: res.error ?? "Couldn’t link that ID.", ok: false });
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">College ID card</p>
          <p className="text-xs text-muted-foreground">
            {isLinked
              ? "Linked — organizers see your name at check-ins, not just a number."
              : "Scan your ID once so organizers see your name at event check-ins. Private — no one else can read it."}
          </p>
        </div>
        {isLinked && <Check className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.4} />}
      </div>

      {scanning ? (
        <>
          <BarcodeScanner onScan={onScan} />
          <button onClick={() => setScanning(false)} className="press text-sm text-muted-foreground">
            Cancel
          </button>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMsg(null);
              setScanning(true);
            }}
            className="press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-strong"
          >
            <ScanLine className="h-4 w-4" strokeWidth={2} />
            {isLinked ? "Re-scan ID" : "Scan my ID"}
          </button>
          {isLinked && (
            <button
              onClick={async () => {
                await unlinkMyId();
                setIsLinked(false);
                setMsg({ text: "ID unlinked.", ok: true });
              }}
              className="press min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              Unlink
            </button>
          )}
        </div>
      )}

      {msg && (
        <p className={`text-xs ${msg.ok ? "text-accent" : "text-destructive"}`}>{msg.text}</p>
      )}
    </div>
  );
}
