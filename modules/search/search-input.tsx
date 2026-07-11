"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

// Debounced URL-synced search box: typing rewrites ?q=, the server component
// re-runs the queries. initialQ comes from the server page — no
// useSearchParams, which demands its own Suspense boundary to behave.
export default function SearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q === initialQ) return; // arrived via URL — nothing to sync
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(q.trim() === "" ? "/search" : `/search?q=${encodeURIComponent(q.trim())}`);
    }, 350);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [q, initialQ, router]);

  return (
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Search everything — books, cycles, lost cards, people…"
      autoFocus
      className={inputClass}
      aria-label="Global search"
    />
  );
}
