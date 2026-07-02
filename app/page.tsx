import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Atmosphere: two soft brand glows anchoring the composition */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
      />

      <p className="animate-fade-up text-sm font-semibold tracking-widest text-primary uppercase">
        LockedIn
      </p>
      <h1
        className="animate-fade-up mt-4 max-w-2xl text-5xl font-bold sm:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        Your campus,
        <br />
        <span className="text-primary">one app.</span>
      </h1>
      <p
        className="animate-fade-up mt-6 max-w-md text-lg text-muted-foreground"
        style={{ animationDelay: "160ms" }}
      >
        Buy &amp; sell · lost &amp; found · group-buys · split subscriptions ·
        find your roommate — verified students only.
      </p>
      <Link
        href="/signup"
        className="animate-fade-up mt-8 flex min-h-12 items-center rounded-lg bg-primary px-7 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
        style={{ animationDelay: "240ms" }}
      >
        Join with your college email
      </Link>
      <p
        className="animate-fade-up mt-4 text-sm text-muted-foreground"
        style={{ animationDelay: "320ms" }}
      >
        No outsiders. That’s the point.
      </p>
    </main>
  );
}
