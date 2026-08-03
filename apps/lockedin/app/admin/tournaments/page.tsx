import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireUser } from "@suite/auth/auth";
import { BackLink, inputClass, SubmitButton } from "@suite/ui";
import { istInputValue } from "@suite/lib/ist";
import { saveTournament } from "@/modules/tournaments/admin-actions";
import AdminControls from "@/modules/tournaments/admin-controls";

// Run a tournament without touching the database.
//
// Dates round-trip through istInputValue/istParse so a time typed here comes
// back out of the form unchanged on a UTC server — packages/lib/ist.test.ts
// asserts that in both directions under three timezones.

type Row = {
  id: string;
  game: string;
  title: string;
  tagline: string | null;
  details: string | null;
  team_size: number;
  starts_at: string | null;
  reg_closes_at: string | null;
  status: string;
  is_featured: boolean;
  prize: string | null;
  contact: string | null;
  logo_url: string | null;
  chat_url: string | null;
  stream_url: string | null;
  team_count: number;
  player_count: number;
};

const STATUSES = [
  ["draft", "Draft — only you can see it"],
  ["open", "Open — people can enter"],
  ["closed", "Closed — visible, no new entries"],
  ["done", "Done — it's over"],
];

function Form({ t }: { t?: Row }) {
  return (
    <form action={saveTournament} className="flex flex-col gap-3">
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Game
          <input name="game" required defaultValue={t?.game ?? ""} placeholder="Valorant" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Players per team
          <input
            name="team_size"
            type="number"
            min={1}
            max={10}
            required
            defaultValue={t?.team_size ?? 5}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Title
        <input name="title" required defaultValue={t?.title ?? ""} placeholder="VIT Valorant Cup" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        One line for the banner
        <input name="tagline" defaultValue={t?.tagline ?? ""} placeholder="5v5 knockout. Bring your own squad." className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Starts (IST)
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={istInputValue(t?.starts_at)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Entries close (IST)
          <input
            name="reg_closes_at"
            type="datetime-local"
            defaultValue={istInputValue(t?.reg_closes_at)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Prize
          <input name="prize" defaultValue={t?.prize ?? ""} placeholder="₹2000 + bragging rights" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Who to ask
          <input name="contact" defaultValue={t?.contact ?? ""} placeholder="@chiranjib_x on Instagram" className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Game logo URL (optional — the publisher owns the artwork, so this is your call)
        <input name="logo_url" defaultValue={t?.logo_url ?? ""} placeholder="https://…/valorant.png" className={inputClass} />

        <label className="text-sm font-medium">
          Group chat invite <span className="font-normal text-muted-foreground">— shown only to people who entered</span>
        </label>
        <input name="chat_url" defaultValue={t?.chat_url ?? ""} placeholder="https://chat.whatsapp.com/…" className={inputClass} />

        <label className="text-sm font-medium">
          Live stream <span className="font-normal text-muted-foreground">— shown to everyone, including the share card</span>
        </label>
        <input name="stream_url" defaultValue={t?.stream_url ?? ""} placeholder="https://youtube.com/live/…" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Status
        <select name="status" defaultValue={t?.status ?? "draft"} className={inputClass}>
          {STATUSES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Rules and details
        <textarea
          name="details"
          rows={5}
          defaultValue={t?.details ?? ""}
          placeholder={"Format, maps, what to bring.\nThis shows on the public page people get sent."}
          className={inputClass}
        />
      </label>

      <SubmitButton pendingLabel="Saving…">{t ? "Save changes" : "Create tournament"}</SubmitButton>
    </form>
  );
}

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .single();
  if (!prof?.is_moderator) notFound();

  const { saved, error } = await searchParams;
  const { data } = await supabase.rpc("admin_list_tournaments");
  const rows = (data ?? []) as Row[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/admin/moderation" label="Admin" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Trophy className="h-6 w-6 text-primary" strokeWidth={2.2} /> Tournaments
        </h1>
        <p className="text-sm text-muted-foreground">
          Whichever one is shown on home appears as a banner above everything else.
          Show none and the banner disappears entirely.
        </p>
      </div>

      {saved && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">Saved.</p>
      )}
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {rows.map((t) => (
        <section key={t.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading font-bold">{t.title}</h2>
            {t.is_featured && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                on home
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {Number(t.player_count)} entered · {Number(t.team_count)} teams
            </span>
            <Link href={`/tournaments/${t.id}`} className="ml-auto text-xs font-semibold text-primary">
              View →
            </Link>
          </div>

          <AdminControls
            id={t.id}
            isFeatured={t.is_featured}
            entrants={Number(t.player_count)}
          />

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Edit</summary>
            <div className="pt-3">
              <Form t={t} />
            </div>
          </details>
        </section>
      ))}

      <details className="rounded-2xl border border-primary/30 bg-card p-4">
        <summary className="cursor-pointer font-heading font-bold">
          {rows.length === 0 ? "Create the first tournament" : "New tournament"}
        </summary>
        <div className="pt-3">
          <Form />
        </div>
      </details>
    </main>
  );
}
