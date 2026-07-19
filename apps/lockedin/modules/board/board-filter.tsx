"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TYPES = [
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
  { value: "notice", label: "Notices" },
] as const;

export default function BoardFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace("/board?" + p.toString(), { scroll: false });
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) apply({ q: q || null });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = params.get("type");

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the board…"
        className="min-h-11 w-full rounded-full border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => apply({ type: null })}
          className={`press shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${!active ? "border-primary bg-primary text-on-primary" : "border-border bg-card"}`}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => apply({ type: active === t.value ? null : t.value })}
            className={`press shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${active === t.value ? "border-primary bg-primary text-on-primary" : "border-border bg-card"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
