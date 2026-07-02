import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button, inputClass } from "@/components/ui";
import { RatingBadge, Stars } from "@/modules/ratings/stars";
import { getRating } from "@/modules/ratings/get-rating";
import { KarmaBadge } from "@/modules/karma/badge";
import { KarmaProgress } from "@/modules/karma/progress";

async function updateProfile(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      batch: String(formData.get("batch") ?? "").trim() || null,
      hostel_block: String(formData.get("hostel_block") ?? "").trim() || null,
      room: String(formData.get("room") ?? "").trim() || null,
      contact_pref: String(formData.get("contact_pref") ?? "").trim() || null,
    })
    .eq("id", user.id);

  revalidatePath("/profile");
  redirect("/profile" + (error ? "?error=" + encodeURIComponent(error.message) : "?saved=1"));
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, colleges(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const rating = await getRating(user.id);
  const { data: ratedComments } = await supabase
    .from("ratings")
    .select("stars, comment, created_at")
    .eq("ratee_id", user.id)
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const field = inputClass;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm text-muted-foreground">
        {user.email} · {profile.colleges?.name}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <KarmaBadge karma={profile.karma ?? 0} showPoints />
        <RatingBadge avg={rating.avg} count={rating.count} />
      </div>
      <KarmaProgress karma={profile.karma ?? 0} />
      {saved && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">Saved.</p>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={updateProfile} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Name
          <input name="name" defaultValue={profile.name} required className={field} />
        </label>
        <label className="text-sm font-medium">
          Batch <span className="font-normal text-muted-foreground">(e.g. 2027)</span>
          <input name="batch" defaultValue={profile.batch ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Hostel / block
          <input name="hostel_block" defaultValue={profile.hostel_block ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Room <span className="font-normal text-muted-foreground">(optional)</span>
          <input name="room" defaultValue={profile.room ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Contact <span className="font-normal text-muted-foreground">(e.g. WhatsApp number — shared only when you choose)</span>
          <input name="contact_pref" defaultValue={profile.contact_pref ?? ""} className={field} />
        </label>
        <Button type="submit" className="mt-2">
          Save
        </Button>
      </form>

      {(ratedComments?.length ?? 0) > 0 && (
        <section className="mt-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Recent feedback</h2>
          {ratedComments!.map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-3">
              <Stars value={r.stars} />
              {r.comment && <p className="mt-1 text-sm text-foreground/85">{r.comment}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
