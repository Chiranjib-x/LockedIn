"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/ui";

type Result = { id: string; name: string; hostel_block: string | null };

// Vouch flow: search same-college profiles (RLS-scoped), add to the space.
// The insert's RLS WITH CHECK enforces that only members can vouch.
export default function AddMember({ spaceId, memberIds }: { spaceId: string; memberIds: string[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function search(term: string) {
    setQ(term);
    if (term.trim().length < 2) return setResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, hostel_block")
      .ilike("name", `%${term.trim()}%`)
      .limit(8);
    setResults((data ?? []).filter((r) => !memberIds.includes(r.id)));
  }

  async function add(profile: Result) {
    setMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("space_members")
      .insert({ space_id: spaceId, user_id: profile.id, added_by: user?.id });
    if (error) setMsg(error.message);
    else {
      setMsg(`${profile.name} is in. 🎉`);
      setResults([]);
      setQ("");
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        ＋ Add someone you trust
      </button>
    );
  }

  return (
    <div className="animate-scale-in flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">
        Only add people you know belong here — you’re vouching for them.
      </p>
      <input
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder="Search by name…"
        className={inputClass}
        autoFocus
      />
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => add(r)}
          className="press flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <span>
            <span className="font-medium">{r.name}</span>
            {r.hostel_block && <span className="text-muted-foreground"> · {r.hostel_block}</span>}
          </span>
          <span className="font-semibold text-primary">Add</span>
        </button>
      ))}
      {msg && <p className="text-sm text-accent">{msg}</p>}
      <button onClick={() => setOpen(false)} className="text-left text-xs text-muted-foreground hover:underline">
        Close
      </button>
    </div>
  );
}
