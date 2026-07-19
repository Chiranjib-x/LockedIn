"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import QRCode from "qrcode";

// Reusable UPI collection helper. Copy-the-VPA + QR flow ONLY — the old
// upi://pay deep link is gone: NPCI blocks P2P intent payments to personal
// VPAs initiated from third-party apps, so the link declined every time.
// Paying: same phone → copy the UPI ID and pay inside your UPI app;
// another phone → scan the QR. No gateway, no verification — the app tracks
// who-paid manually. TODO: Razorpay auto-verification arrives with Wave E.
export default function UpiPay({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}) {
  // QR keeps the full pay URI — scanning from a second device is a normal
  // in-app P2P payment, which the restriction doesn't cover.
  const link =
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}` +
    `&am=${amount.toFixed(2)}&cu=INR` +
    (note ? `&tn=${encodeURIComponent(note.slice(0, 50))}` : "");

  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (rare in-app) — the visible UPI ID below is the fallback
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          {copied ? "UPI ID copied" : `Copy UPI ID · pay ₹${amount.toFixed(0)}`}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((s) => !s)}
          className="press min-h-11 rounded-full border border-border bg-card px-4 text-sm font-medium"
        >
          {showQr ? "Hide QR" : "QR"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pay <span className="font-medium text-foreground">₹{amount.toFixed(2)}</span> to{" "}
        <span className="font-medium text-foreground">{upiId}</span> in any UPI app
        {note ? <> · note: {note.slice(0, 50)}</> : null}
      </p>
      {showQr && qr && (
        <div className="animate-scale-in flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`UPI QR to pay ${payeeName}`} className="h-52 w-52" />
          <p className="text-xs text-muted-foreground">
            Scan from another phone · {upiId}
          </p>
        </div>
      )}
    </div>
  );
}
