"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
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
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/home");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
