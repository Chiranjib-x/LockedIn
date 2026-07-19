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
    const t0 = performance.now();
    const dur = 900;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{shown}</span>;
}
