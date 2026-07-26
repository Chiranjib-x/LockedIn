"use client";

import { useEffect, useRef, useState } from "react";

// Animates 0 → value once on mount (~0.9s ease-out). Static under
// prefers-reduced-motion, and renders the final value for no-JS/SSR.
export default function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || value <= 0) return;
    ran.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dur = 900;
    let raf: number;
    let t0 = 0;
    // The first frame establishes t0 and emits ~0, so no synchronous setState
    // is needed in the effect body (react-hooks/set-state-in-effect).
    const tick = (t: number) => {
      if (t0 === 0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{shown}</span>;
}
