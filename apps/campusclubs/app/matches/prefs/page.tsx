import { requireUser } from "@/lib/auth";
import { inputClass } from "@suite/ui";
import { BackLink } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import { Toggle } from "@/components/toggle";
import { savePrefs } from "@/modules/matcher/actions";

export default async function PrefsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await searchParams;
  const { data: prefs } = await supabase
    .from("match_prefs").select("*").eq("user_id", user.id).maybeSingle();

  const radio = (name: string, value: string, label: string, current: string) => (
    <label className={`press flex-1 cursor-pointer rounded-2xl border px-3 py-2.5 text-center text-sm font-medium has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary ${"border-border bg-card"}`}>
      <input type="radio" name={name} value={value} defaultChecked={current === value} className="sr-only" />
      {label}
    </label>
  );

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/matches" label="Matches" />
      <div>
        <h1 className="text-2xl font-bold">Your living & study style</h1>
        <p className="text-sm text-muted-foreground">Honest answers get better matches.</p>
      </div>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={savePrefs} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">I&rsquo;m looking for</legend>
          <div className="flex gap-2">
            {radio("looking_for", "roommate", "🛏️ Roommate", prefs?.looking_for ?? "both")}
            {radio("looking_for", "study_buddy", "📚 Study buddy", prefs?.looking_for ?? "both")}
            {radio("looking_for", "both", "Both", prefs?.looking_for ?? "both")}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Sleep schedule</legend>
          <div className="flex gap-2">
            {radio("sleep_schedule", "early", "🌅 Early bird", prefs?.sleep_schedule ?? "normal")}
            {radio("sleep_schedule", "normal", "Normal", prefs?.sleep_schedule ?? "normal")}
            {radio("sleep_schedule", "late", "🦉 Night owl", prefs?.sleep_schedule ?? "normal")}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Study style</legend>
          <div className="flex gap-2">
            {radio("study_style", "quiet", "🤫 Quiet solo", prefs?.study_style ?? "quiet")}
            {radio("study_style", "group", "👥 Group study", prefs?.study_style ?? "quiet")}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Cleanliness: messy 1 — 5 spotless
          <input type="range" name="cleanliness" min={1} max={5} defaultValue={prefs?.cleanliness ?? 3} className="accent-(--color-primary)" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Noise tolerance: silence 1 — 5 anything goes
          <input type="range" name="noise_tolerance" min={1} max={5} defaultValue={prefs?.noise_tolerance ?? 3} className="accent-(--color-primary)" />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Food</legend>
          <div className="flex gap-2">
            {radio("food_pref", "veg", "🌱 Veg", prefs?.food_pref ?? "any")}
            {radio("food_pref", "nonveg", "🍗 Non-veg", prefs?.food_pref ?? "any")}
            {radio("food_pref", "any", "Anything", prefs?.food_pref ?? "any")}
          </div>
        </fieldset>

        <Toggle name="smoking" defaultChecked={prefs?.smoking ?? false} label="I smoke" />

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Short bio
          <textarea name="bio" rows={3} defaultValue={prefs?.bio ?? ""} placeholder="Branch, hobbies, what you're like at 2 a.m…." className={inputClass} />
        </label>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <Toggle
            name="is_opted_in"
            defaultChecked={prefs?.is_opted_in ?? true}
            label="Show me in matching"
            hint="Only opted-in students appear to each other"
          />
        </div>

        <SubmitButton pendingLabel="Saving…">Save &amp; see matches</SubmitButton>
      </form>
    </main>
  );
}
