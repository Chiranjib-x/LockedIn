import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { requireUser } from "@suite/auth/auth";
import { Card, inputClass, SubmitButton, BackLink } from "@suite/ui";
import { sendBroadcast } from "@/modules/broadcast/actions";

// Announce an update to everyone at your college. Delivered through the
// notification rails that already exist, so anyone with push enabled gets it on
// their phone and everyone else sees it in the bell.
export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_moderator, college_id")
    .eq("id", user.id)
    .single();
  if (!prof?.is_moderator) notFound();

  const { error, sent } = await searchParams;

  // How many people this would actually reach, and how many of those get it as
  // a phone notification rather than only a bell badge — the honest number.
  const [{ count: audience }, { count: pushable }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_banned", false),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase
      .from("broadcasts")
      .select("id, message, recipients, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const reach = Math.max((audience ?? 1) - 1, 0); // the sender is skipped

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/home" label="Home" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Megaphone className="h-6 w-6 text-primary" strokeWidth={2} /> Broadcast
        </h1>
        <p className="text-sm text-muted-foreground">
          One message to every student at your college. This cannot be unsent.
        </p>
      </div>

      {sent && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Sent to {sent} student{sent === "1" ? "" : "s"}. 🎉
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="flex flex-col gap-2">
        <p className="text-sm">
          Reaches <span className="font-semibold text-primary">{reach}</span> student
          {reach === 1 ? "" : "s"} in the app
          {(pushable ?? 0) > 0 && (
            <>
              , of whom <span className="font-semibold text-primary">{pushable}</span> get it as a
              phone notification
            </>
          )}
          .
        </p>
        {(pushable ?? 0) < reach && (
          <p className="text-xs text-muted-foreground">
            The rest see it in their notification bell next time they open the app — they haven&rsquo;t
            turned push on.
          </p>
        )}
      </Card>

      <form action={sendBroadcast} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Message <span className="font-normal text-muted-foreground">(max 180 characters)</span>
          <textarea
            name="message"
            required
            maxLength={180}
            rows={3}
            placeholder="Places search is live — find any building on campus by its nickname."
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Opens <span className="font-normal text-muted-foreground">(optional — defaults to Home)</span>
          <input name="link" placeholder="/search?tab=places" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Sending…">Send to everyone</SubmitButton>
        <p className="text-xs text-muted-foreground">
          One broadcast per 30 minutes, enforced server-side. Write it like a notification, because
          that is what it is.
        </p>
      </form>

      {(history ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Recent</h2>
          {(history ?? []).map((b) => (
            <Card key={b.id} className="flex flex-col gap-1">
              <p className="text-sm">{b.message}</p>
              <p className="text-xs text-muted-foreground">
                {b.recipients} recipient{b.recipients === 1 ? "" : "s"} ·{" "}
                {new Date(b.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
