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
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-primary">LockedIn</h1>
      <p className="max-w-xs text-lg text-muted-foreground">
        Buy, sell, split, and find your people — all inside your campus.
      </p>
      <Link
        href="/signup"
        className="flex min-h-12 items-center rounded-lg bg-primary px-6 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all duration-150 hover:opacity-90"
      >
        Join with your college email
      </Link>
      <p className="text-sm text-muted-foreground">
        Verified students only. That&apos;s the point.
      </p>
    </main>
  );
}
