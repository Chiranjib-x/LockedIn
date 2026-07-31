"use client";

import { useState } from "react";
import { createClient } from "@suite/auth/client";
import { inputClass } from "@suite/ui";

export type ProfileHit = {
  id: string;
  name: string;
  username: string;
  hostel_block: string | null;
};

// Same-college people picker, EXACT @username only (find_by_username, 0037).
// Deliberately not a name search: browsing classmates by name is how you build
// a target list. You pick someone by the username they gave you.
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
  const [searched, setSearched] = useState(false);

  async function search(term: string) {
    setQ(term);
    const uname = term.trim().replace(/^@/, "");
    if (uname.length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    const { data } = await supabase.rpc("find_by_username", { uname });
    setResults(((data ?? []) as ProfileHit[]).filter((r) => !excludeIds.includes(r.id)));
    setSearched(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <input aria-label="Their exact @username"
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder="Their exact @username"
        className={inputClass}
      />
      {searched && results.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No one with that username — ask them for it.
        </p>
      )}
      {results.map((r) => (
        <button
          key={r.id}
          onClick={async () => {
            await onPick(r);
            setResults([]);
            setQ("");
            setSearched(false);
          }}
          className="press flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <span>
            <span className="font-medium">{r.name}</span>
            <span className="text-muted-foreground"> · @{r.username}</span>
          </span>
          <span className="font-semibold text-primary">{actionLabel}</span>
        </button>
      ))}
    </div>
  );
}
