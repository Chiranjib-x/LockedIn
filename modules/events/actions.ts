"use server";

import { createClient } from "@/lib/supabase/server";

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
