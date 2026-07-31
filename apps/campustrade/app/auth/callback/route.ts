import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@suite/auth/server";

// Handles the redirect back from Supabase OAuth providers (Google, etc).
// The college-domain gate (migration 0036 handle_new_user trigger) runs
// server-side on every new auth.users row, so a non-college Google account
// fails here with that trigger's error message.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent(error.message), request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/login?error=" + encodeURIComponent("Google sign-in failed — try again."), request.url)
  );
}
