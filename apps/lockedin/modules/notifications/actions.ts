"use server";

import { createClient } from "@suite/auth/server";
import { revalidatePath } from "next/cache";

// FINDINGS F42. revalidatePath with "layout" is the point: the unread badge
// lives in the header (a layout Server Component), so invalidating only the
// page would leave the badge showing the pre-read count.
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return; // best-effort: the list still rendered fine

  revalidatePath("/", "layout");
}
