import { redirect } from "next/navigation";
import { createClient } from "@suite/auth/server";
import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import AuthHero from "@/modules/auth/hero";
import GoogleAuthButton from "@/components/google-auth-button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in? This page has nothing to offer — send them in.
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (user) redirect("/gate");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <AuthHero tagline="Every student here is verified." />
      <div className="glass animate-fade-up flex flex-col gap-4 rounded-3xl p-5" style={{ animationDelay: "220ms" }}>
        <h1 className="text-xl font-bold">Sign up</h1>
        <p className="text-sm text-muted-foreground">
          Only registered college email domains can join — so every runner and
          requester is a verified student on your campus.
        </p>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <form action={signup} className="flex flex-col gap-3">
          <input aria-label="Your name" name="name" type="text" required autoComplete="name" placeholder="Your name" className={inputClass} />
          <input aria-label="you@vitstudent.ac.in" name="email" type="email" required autoComplete="email" placeholder="you@vitstudent.ac.in" className={inputClass} />
          <input aria-label="Password (min 8 characters)"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Password (min 8 characters)"
            className={inputClass}
          />
          <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
        </form>
        <GoogleAuthButton />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
