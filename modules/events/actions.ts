"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Link the caller's OWN ID card. The stored value is the exact barcode string,
// so it matches byte-for-byte when an organizer scans the same card at check-in
// (typing it by hand would not — students can't know their barcode's encoding).
export async function linkMyId(code: string): Promise<{ ok: boolean; error?: string }> {
  const clean = code.trim();
  if (!clean) return { ok: false, error: "That scan was empty — try again." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("profiles").update({ roll_number: clean }).eq("id", user.id);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505"
        ? "That ID is already linked to another account."
        : "Couldn’t link that ID.",
    };
  }
  revalidatePath("/profile");
  return { ok: true };
}

export async function unlinkMyId(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ roll_number: null }).eq("id", user.id);
  revalidatePath("/profile");
}

export type CheckinResult = {
  attendee_name: string | null;
  is_new: boolean;
  error?: string;
};

// Thin wrapper over the record_checkin() RPC (0042). All authorization,
// college scoping, attendee resolution and idempotency live in the RPC.
export async function recordCheckin(postId: string, code: string): Promise<CheckinResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_checkin", {
    p_post_id: postId,
    p_code: code,
  });
  if (error) {
    const msg = error.message.includes("not authorized")
      ? "You can’t check people in for this event."
      : error.message.includes("empty code")
        ? "That scan was empty — try again."
        : "Couldn’t record that check-in.";
    return { attendee_name: null, is_new: false, error: msg };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { attendee_name: row?.attendee_name ?? null, is_new: !!row?.is_new };
}
