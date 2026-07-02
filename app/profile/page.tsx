import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  const field =
    "rounded-md border border-zinc-300 px-3 py-2 w-full";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm text-zinc-500">
        {user.email} · {profile.colleges?.name}
      </p>
      {saved && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Saved.</p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <form action={updateProfile} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Name
          <input name="name" defaultValue={profile.name} required className={field} />
        </label>
        <label className="text-sm font-medium">
          Batch <span className="font-normal text-zinc-400">(e.g. 2027)</span>
          <input name="batch" defaultValue={profile.batch ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Hostel / block
          <input name="hostel_block" defaultValue={profile.hostel_block ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Room <span className="font-normal text-zinc-400">(optional)</span>
          <input name="room" defaultValue={profile.room ?? ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          Contact <span className="font-normal text-zinc-400">(e.g. WhatsApp number — shared only when you choose)</span>
          <input name="contact_pref" defaultValue={profile.contact_pref ?? ""} className={field} />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Save
        </button>
      </form>
    </main>
  );
}
