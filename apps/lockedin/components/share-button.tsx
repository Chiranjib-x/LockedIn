"use client";

import { useEffect, useState } from "react";

// Phase 22 share entry point: Web Share API where available (mobile), else a
// WhatsApp deep-link + copy-link pair. `path` is the PUBLIC preview path
// (/p/listing/[id] or /p/post/[id]) — never the auth-gated detail page, since
// that's what recipients and crawlers can actually open.
export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.origin + path);
    setCanNativeShare(typeof navigator.share === "function");
  }, [path]);

  if (url === "") return null;

  if (canNativeShare) {
    return (
      <button
        onClick={async () => {
          try {
            await navigator.share({ title, url });
          } catch {
            // user cancelled the share sheet — nothing to do
          }
        }}
        className="press flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
      >
        ↗ Share
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="press flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
      >
        WhatsApp
      </a>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // clipboard unavailable (http, permissions) — leave the label as-is
          }
        }}
        className="press flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </span>
  );
}
