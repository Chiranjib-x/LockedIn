"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Reusable UPI collection helper: deep link (mobile) + scannable QR (desktop /
// friend's phone). No gateway, no verification — payment happens in the UPI
// app; the app tracks who-paid manually. TODO: Razorpay auto-verification
// arrives with Wave E if ever needed for group-buys.
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
  const link =
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}` +
    `&am=${amount.toFixed(2)}&cu=INR` +
    (note ? `&tn=${encodeURIComponent(note.slice(0, 50))}` : "");

  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [link]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <a
          href={link}
          className="press flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          Pay ₹{amount.toFixed(0)} via UPI
        </a>
        <button
          type="button"
          onClick={() => setShowQr((s) => !s)}
          className="press min-h-11 rounded-full border border-border bg-card px-4 text-sm font-medium"
        >
          {showQr ? "Hide QR" : "QR"}
        </button>
      </div>
      {showQr && qr && (
        <div className="animate-scale-in flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`UPI QR to pay ${payeeName}`} className="h-52 w-52" />
          <p className="text-xs text-muted-foreground">
            Scan with any UPI app · {upiId}
          </p>
        </div>
      )}
    </div>
  );
}
