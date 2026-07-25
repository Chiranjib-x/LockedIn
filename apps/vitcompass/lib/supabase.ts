import { createClient } from "@supabase/supabase-js";

// Anon, cookieless client. VIT Compass is public-read (a fresher exploring the
// campus may not have their college email yet), so no auth session is needed.
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
