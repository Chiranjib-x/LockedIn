"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/ui";

export type ProfileHit = { id: string; name: string; hostel_block: string | null };

// Shared same-college people picker (RLS scopes the search automatically).
export default function ProfileSearch({
  excludeIds = [],
  actionLabel = "Add",
  onPick,
}: {
  excludeIds?: string[];
  actionLabel?: string;
  onPick: (p: ProfileHit) => void | Promise<void>;
}) {
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProfileHit[]>([]);

  async function search(term: string) {
    setQ(term);
    if (term.trim().length < 2) return setResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, hostel_block")
      .ilike("name", `%${term.trim()}%`)
      .limit(8);
    setResults((data ?? []).filter((r) => !excludeIds.includes(r.id)));
  }

  return (
    <div className="flex flex-col gap-2">
      <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search by name…" className={inputClass} />
      {results.map((r) => (
        <button
          key={r.id}
          onClick={async () => {
            await onPick(r);
            setResults([]);
            setQ("");
          }}
          className="press flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <span>
            <span className="font-medium">{r.name}</span>
            {r.hostel_block && <span className="text-muted-foreground"> · {r.hostel_block}</span>}
          </span>
          <span className="font-semibold text-primary">{actionLabel}</span>
        </button>
      ))}
    </div>
  );
}
