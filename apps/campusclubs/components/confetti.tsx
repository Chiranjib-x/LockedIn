"use client";

import { useEffect, useState } from "react";

// One-shot CSS confetti burst for success moments (REVAMP-PLAN Phase 3).
// Fires once per `id` per session (sessionStorage), skipped under
// prefers-reduced-motion. Pure CSS pieces — no dependency.
const PIECES = 26;

export default function Confetti({ id }: { id: string }) {
  const [go, setGo] = useState(false);

  useEffect(() => {
    const key = `confetti:${id}`;
    if (sessionStorage.getItem(key)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sessionStorage.setItem(key, "1");
    // Start on the next frame rather than synchronously in the effect body —
    // a burst that begins one frame later is indistinguishable, and setState
    // belongs in a callback (react-hooks/set-state-in-effect).
    const start = requestAnimationFrame(() => setGo(true));
    const t = setTimeout(() => setGo(false), 2600);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(t);
    };
  }, [id]);

  if (!go) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: PIECES }).map((_, i) => {
        const left = (i * 37) % 100;
        const hue = ["var(--color-primary)", "var(--color-violet)", "var(--color-accent)"][i % 3];
        return (
          <span
            key={i}
            className="confetti-piece absolute top-[-4%] block h-2.5 w-1.5 rounded-sm"
            style={{
              left: `${left}%`,
              background: hue,
              animationDelay: `${(i % 9) * 120}ms`,
              animationDuration: `${1800 + (i % 5) * 220}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
