import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import AuthHero from "@/modules/auth/hero";
import GoogleAuthButton from "@/components/google-auth-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  // Already signed in? This page has nothing to offer — send them in.
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (user) redirect("/home");

  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <AuthHero tagline="Your campus. One app." />
      <div className="glass animate-fade-up flex flex-col gap-4 rounded-3xl p-5" style={{ animationDelay: "220ms" }}>
        <h1 className="text-xl font-bold">Log in</h1>
        {message && (
          <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <form action={login} className="flex flex-col gap-3">
          <input aria-label="you@vitstudent.ac.in" name="email" type="email" required autoComplete="email" placeholder="you@vitstudent.ac.in" className={inputClass} />
          <input aria-label="Password" name="password" type="password" required autoComplete="current-password" placeholder="Password" className={inputClass} />
          <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
        </form>
        <GoogleAuthButton />
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline">
            Sign up with your college email
          </Link>
        </p>
      </div>
    </main>
  );
}
