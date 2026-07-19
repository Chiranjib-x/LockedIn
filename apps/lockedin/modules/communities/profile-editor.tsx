"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { useRefresh } from "@/lib/use-refresh";
import { editCommunityProfile } from "./actions";

// Lead-only "Edit profile" — name, emoji, logo, description. Collapsed behind a
// button so it never clutters the page for members.
export default function ProfileEditor({
  cid,
  name,
  emoji,
  logoUrl,
  description,
}: {
  cid: string;
  name: string;
  emoji: string;
  logoUrl: string | null;
  description: string | null;
}) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(name);
  const [e, setE] = useState(emoji);
  const [logo, setLogo] = useState<string[]>(logoUrl ? [logoUrl] : []);
  const [desc, setDesc] = useState(description ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium hover:bg-muted"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit profile
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-card p-4">
      <p className="text-sm font-semibold">Edit profile</p>
      <div className="flex gap-2">
        <label className="flex w-20 flex-col gap-1 text-xs font-medium">
          Emoji
          <input value={e} onChange={(ev) => setE(ev.target.value)} maxLength={4}
            className="min-h-10 rounded-xl border border-border bg-background px-2 text-center text-lg" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium">
          Name
          <input value={n} onChange={(ev) => setN(ev.target.value)}
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        </label>
      </div>
      <div className="flex flex-col gap-1 text-xs font-medium">
        Logo <span className="font-normal text-muted-foreground">(square looks best; clear it to fall back to the emoji)</span>
        <ImageUpload bucket="post-images" value={logo} onChange={setLogo} max={1} />
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Description
        <textarea value={desc} onChange={(ev) => setDesc(ev.target.value)} rows={4}
          placeholder="What you do, when you meet, what you're about…"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const msg = await editCommunityProfile(cid, { name: n, emoji: e, logoUrl: logo[0] ?? "", description: desc });
            setBusy(false);
            if (msg) setErr(msg);
            else { setOpen(false); refresh(); }
          }}
          className="press min-h-10 flex-1 rounded-full bg-primary text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="press min-h-10 rounded-full border border-border px-4 text-sm font-medium">
          Cancel
        </button>
      </div>
    </div>
  );
}
