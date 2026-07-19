"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { inputClass } from "@/components/ui";

// Formats seen on student / government ID cards: PDF417 (dense 2D block) is the
// most common, plus the 1D families and QR/DataMatrix. Listing them + TRY_HARDER
// makes the decoder spend real effort instead of bailing per frame.
const FORMATS = [
  BarcodeFormat.PDF_417,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.AZTEC,
];

export default function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });

    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        // High res gives a dense PDF417 / small 1D barcode enough pixels to resolve.
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        videoRef.current!,
        (result) => {
          setStatus("scanning");
          if (!result) return; // no barcode this frame — keep trying
          const code = result.getText().trim();
          const now = Date.now();
          if (code === lastRef.current.code && now - lastRef.current.at < 2500) return;
          lastRef.current = { code, at: now };
          onScanRef.current(code);
        }
      )
      .then((c) => (cancelled ? c.stop() : (controls = c)))
      .catch((e) => {
        setStatus("error");
        setCamError(e?.message ?? "unavailable");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {status !== "error" ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline autoPlay />
          {/* aiming frame */}
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {status === "starting" ? "Starting camera…" : "Fill the frame with the barcode · hold steady · good light"}
          </span>
        </div>
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
        />
        <button type="submit" className="press shrink-0 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
          Add
        </button>
      </form>
    </div>
  );
}
