"use server";

import { createClient } from "@suite/auth/server";
import { redirect } from "next/navigation";

// Auth errors are shown to the student verbatim, so an unusable message becomes
// an unusable screen. A GoTrue 5xx surfaces as `message: "{}"` — observed live:
// a login against a broken auth row redirected to `/login?error=%7B%7D`, i.e.
// the page told the user "{}". Anything empty or object-shaped gets replaced
// with something they can act on.
function authMessage(error: { message?: string } | null, fallback: string) {
  const m = (error?.message ?? "").trim();
  if (!m || m === "{}" || m === "[object Object]") return fallback;
  return m;
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const supabase = await createClient();

  // Friendly pre-check; the DB trigger is the real trust boundary.
  const domain = email.split("@")[1] ?? "";
  const { data: college, error: collegeError } = await supabase
    .from("colleges")
    .select("id, name")
    .eq("email_domain", domain)
    .maybeSingle();
  if (collegeError) {
    redirect("/signup?error=" + encodeURIComponent("Couldn't reach the server — try again."));
  }
  if (!college) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Use your college email — that domain isn't registered.")
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    redirect(
      "/signup?error=" +
        encodeURIComponent(authMessage(error, "Couldn't create your account — try again in a moment."))
    );
  }

  // Email confirmation OFF → signUp returns a session; the user is already
  // logged in, so go straight in. Confirmation ON → no session; ask them to
  // check their inbox. Handles either Supabase setting correctly.
  if (data.session) {
    redirect("/gate");
  }
  redirect(
    "/login?message=" +
      encodeURIComponent("Check your email for a confirmation link, then log in.")
  );
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent(authMessage(error, "Couldn't log you in — try again in a moment."))
    );
  }

  redirect("/gate");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Play Store account-deletion requirement. delete_my_account() (migration
// 0050) is SECURITY DEFINER and hard-scoped to auth.uid(); the auth.users
// delete cascades through profiles into all content.
export async function deleteAccount(formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (confirm !== "DELETE") {
    redirect("/delete-account?error=" + encodeURIComponent("Type DELETE in the box to confirm."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=" + encodeURIComponent("Log in first, then delete your account."));

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    redirect("/delete-account?error=" + encodeURIComponent("Couldn't delete your account — try again, or email us (see Privacy Policy)."));
  }
  // Best-effort: the user row is already gone, so the server-side revoke can
  // 4xx — signOut still clears the local session cookies either way.
  await supabase.auth.signOut();
  redirect("/login?message=" + encodeURIComponent("Your account and data have been deleted."));
}
