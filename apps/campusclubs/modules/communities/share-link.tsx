"use client";

import { useState, useSyncExternalStore } from "react";
import { Link2, Check, Share2 } from "lucide-react";

const noopSubscribe = () => () => {};

// A clean, visible shareable link with copy + native-share. Used on /for-clubs
// so the link can be sent to club owners looking professional.
export default function ShareLink({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // Browser-state reads, not effects — SSR snapshot is empty so the block
  // simply doesn't render server-side (its previous behaviour too).
  const url = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin + path,
    () => ""
  );
  const pretty = url.replace(/^https?:\/\//, "");
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );

  if (!url) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — link is still visible to select */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{pretty}</span>
        <button onClick={copy} className="press shrink-0 text-sm font-semibold text-primary">
          {copied ? (
            <span className="flex items-center gap-1 text-accent">
              <Check className="h-4 w-4" strokeWidth={2.4} /> Copied
            </span>
          ) : (
            "Copy"
          )}
        </button>
      </div>
      {canShare && (
        <button
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          <Share2 className="h-4 w-4" strokeWidth={2} /> Share this link
        </button>
      )}
    </div>
  );
}
