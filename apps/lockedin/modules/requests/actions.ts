"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Post a "want". college_id is stamped server-side; RLS WITH CHECK enforces it
// plus space membership (when space_id is set) and the not-banned rule.
export async function saveRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const spaceId = String(formData.get("space_id") ?? "").trim() || null;
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw === "" ? null : Number(budgetRaw);

  const backTo = spaceId ? `/spaces/${spaceId}` : "/marketplace/requests";
  if (!title || !category || (budget !== null && (Number.isNaN(budget) || budget < 0))) {
    redirect(
      `/marketplace/requests/new${spaceId ? `?space=${spaceId}&` : "?"}error=` +
        encodeURIComponent("A title, a category, and (if set) a valid budget are required.")
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("college_id").eq("id", user.id).single();

  const { error } = await supabase.from("requests").insert({
    requester_id: user.id,
    college_id: profile?.college_id,
    space_id: spaceId,
    title,
    category,
    budget,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error) {
    redirect(
      `/marketplace/requests/new${spaceId ? `?space=${spaceId}&` : "?"}error=` +
        encodeURIComponent(error.message)
    );
  }

  revalidatePath(backTo);
  redirect(backTo);
}

// Toggle open ↔ fulfilled. RLS: requester-only.
export async function setRequestFulfilled(id: string, fulfilled: boolean) {
  const supabase = await createClient();
  await supabase.from("requests").update({ status: fulfilled ? "fulfilled" : "open" }).eq("id", id);
  revalidatePath("/marketplace/requests");
}

export async function deleteRequest(id: string) {
  const supabase = await createClient();
  await supabase.from("requests").delete().eq("id", id);
  revalidatePath("/marketplace/requests");
}
