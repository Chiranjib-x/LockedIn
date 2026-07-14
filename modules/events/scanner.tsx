"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { inputClass } from "@/components/ui";

// Continuous barcode scanner (rear camera) with a manual-entry fallback for
// worn cards / devices without camera access. Calls onScan(code) per read;
// same-code re-reads within 2.5s are debounced so one card = one check-in.
export default function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan; // keep latest without restarting the camera
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;
    let cancelled = false;
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result) => {
        if (!result) return;
        const code = result.getText().trim();
        const now = Date.now();
        if (code === lastRef.current.code && now - lastRef.current.at < 2500) return;
        lastRef.current = { code, at: now };
        onScanRef.current(code);
      })
      .then((c) => (cancelled ? c.stop() : (controls = c)))
      .catch((e) => setCamError(e?.message ?? "unavailable"));
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {!camError ? (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-2xl border border-border bg-black object-cover"
          muted
          playsInline
        />
      ) : (
        <p className="rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">
          Camera unavailable ({camError}) — type the ID number instead.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = manual.trim();
          if (v) {
            onScanRef.current(v);
            setManual("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or enter ID number"
          className={inputClass}
          inputMode="numeric"
        />
        <button type="submit" className="press shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
          Add
        </button>
      </form>
    </div>
  );
}
