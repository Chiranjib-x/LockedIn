"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES } from "./constants";

// Search + category + sort, all reflected in the URL so results are shareable
// and back-button friendly. Search debounced; chips/sort commit immediately.
export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace("/marketplace?" + p.toString(), { scroll: false });
  }

  // Debounce the text query.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) apply({ q: q || null });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCat = params.get("category");
  const sort = params.get("sort") ?? "new";
  const ltype = params.get("ltype");

  return (
    <div className="flex flex-col gap-3">
      <input aria-label="Search listings"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search listings…"
        className="min-h-11 w-full rounded-full border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      <div className="grid grid-cols-3 gap-2 text-sm">
        {[
          { v: null, label: "Everything" },
          { v: "sell", label: "For sale" },
          { v: "rent", label: "For rent" },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() => apply({ ltype: t.v })}
            className={`press rounded-full border px-3 py-1.5 font-medium ${
              ltype === t.v ? "border-primary bg-primary text-on-primary" : "border-border bg-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => apply({ category: null })}
          className={`press shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${!activeCat ? "border-primary bg-primary text-on-primary" : "border-border bg-card"}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => apply({ category: activeCat === c ? null : c })}
            className={`press shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${activeCat === c ? "border-primary bg-primary text-on-primary" : "border-border bg-card"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort</span>
        <select
          value={sort}
          onChange={(e) => apply({ sort: e.target.value === "new" ? null : e.target.value })}
          className="min-h-9 rounded-full border border-border bg-card px-3"
        >
          <option value="new">Newest</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
      </div>
    </div>
  );
}
