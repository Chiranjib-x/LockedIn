import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Protected-route wrapper: call at the top of any module page.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
