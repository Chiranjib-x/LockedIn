import Link from "next/link";
import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import { getRating } from "@/modules/ratings/get-rating";
import { ArrowRight, Bookmark } from "lucide-react";
import { KarmaProgress } from "@/modules/karma/progress";
import HunterCard from "@/modules/karma/hunter-card";
import LogoutButton from "@/components/logout-button";
import LinkId from "@/modules/events/link-id";
import GenderField from "@/modules/profile/gender-field";

async function updateProfile(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      username,
      batch: String(formData.get("batch") ?? "").trim() || null,
      hostel_block: String(formData.get("hostel_block") ?? "").trim() || null,
      room: String(formData.get("room") ?? "").trim() || null,
      // Blank means "not answered" and is stored as null, which is distinct from
      // the deliberate answer "Prefer not to say". Sliced to the 40 the DB check
      // allows so a long paste is trimmed rather than rejected with a raw error.
      gender: String(formData.get("gender") ?? "").trim().slice(0, 40) || null,
    })
    .eq("id", user.id);

  // DB is the trust boundary: unique index + format check own these rules.
  const friendly =
    error?.code === "23505"
      ? "That username is taken — pick another."
      : error?.code === "23514"
        ? "Usernames are 3–20 characters: lowercase letters, numbers, underscores."
        : error?.message;

  revalidatePath("/profile");
  redirect("/profile" + (friendly ? "?error=" + encodeURIComponent(friendly) : "?saved=1"));
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

  // my_profile() — `room` is no longer selectable through the API by anyone, so
  // the owner reads their own full row via this definer RPC. Introduced in 0041;
  // the LIVE definition is 0042 (+ roll_number) and then 0087 (+ gender). Rebuild
  // it from the latest, never from 0041, or the later columns vanish.
  const { data: profile } = await supabase
    .rpc("my_profile")
    .single<{
      id: string;
      name: string;
      username: string;
      verified_name: string | null;
      batch: string | null;
      hostel_block: string | null;
      room: string | null;
      roll_number: string | null;
      karma: number;
      gender: string | null;
    }>();

  if (!profile) redirect("/login");

  const rating = await getRating(user.id);
  const field = inputClass;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-8">
      <HunterCard
        name={profile.name ?? "Student"}
        verifiedName={profile.verified_name}
        detail={[`@${profile.username}`, user.email, profile.batch, profile.hostel_block ? `Block ${profile.hostel_block}` : null]
          .filter(Boolean)
          .join(" · ")}
        karma={profile.karma ?? 0}
        rating={rating}
      />
      <KarmaProgress karma={profile.karma ?? 0} />
      <Link
        href="/saved"
        className="press flex min-h-11 items-center justify-between rounded-2xl border border-border bg-card px-4 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" strokeWidth={2} /> Saved items & alerts
        </span>
        <ArrowRight className="h-4 w-4 text-primary" strokeWidth={2.2} />
      </Link>
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
          Username <span className="font-normal text-muted-foreground">(unique — people need it to find you)</span>
          <input
            name="username"
            defaultValue={profile.username}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            title="Lowercase letters, numbers, underscores"
            className={field}
          />
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
          Room <span className="font-normal text-muted-foreground">(optional, private)</span>
          <input name="room" defaultValue={profile.room ?? ""} className={field} />
        </label>
        <GenderField value={profile.gender} />
        <SubmitButton pendingLabel="Saving…" className="mt-2">
          Save
        </SubmitButton>
      </form>

      <LinkId linked={profile.roll_number != null} />

      {rating.count > 0 && (
        <p className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Your rating is the average of {rating.count} deal{rating.count === 1 ? "" : "s"}.
          Individual feedback is kept private — you see the score, not who said what.
        </p>
      )}

      <LogoutButton />

      {/* Students had no route to a human anywhere in the app — the banned
          banner said "contact an admin" with nothing to tap. */}
      <a
        href="https://www.instagram.com/chiranjib_x/"
        target="_blank"
        rel="noopener noreferrer"
        className="press inline-flex min-h-11 items-center justify-center text-center text-xs text-muted-foreground underline hover:text-foreground"
      >
        Something broken or unfair? Message @chiranjib_x on Instagram
      </a>

      <Link
        href="/delete-account"
        className="press inline-flex min-h-11 items-center justify-center text-center text-xs text-muted-foreground underline hover:text-destructive"
      >
        Delete my account
      </Link>
    </main>
  );
}
