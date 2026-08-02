"use client";

import { useState, useSyncExternalStore } from "react";

// Phase 22 share entry point: Web Share API where available (mobile), else a
// WhatsApp deep-link + copy-link pair. `path` is the PUBLIC preview path
// (/p/listing/[id] or /p/post/[id]) — never the auth-gated detail page, since
// that's what recipients and crawlers can actually open.
const noopSubscribe = () => () => {};

export default function ShareButton({ path, title }: { path: string; title: string }) {
  // Both values are browser state read once — useSyncExternalStore keeps them
  // out of an effect and gives SSR an empty snapshot, so the button simply
  // doesn't render on the server (its previous behaviour too).
  // The canonical site URL, NOT window.location.origin. The old domain is still
  // attached and serving, so anyone who opened the app there was generating
  // share links back to it — the link travels further than the visit does, and
  // it should always carry the domain the product is called by. Falls back to
  // the current origin only if the env var is somehow absent at build time.
  const url = useSyncExternalStore(
    noopSubscribe,
    () => (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + path,
    () => ""
  );
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );
  const [copied, setCopied] = useState(false);

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
