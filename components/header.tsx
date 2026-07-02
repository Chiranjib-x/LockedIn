import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur">
      <Link
        href="/"
        className="flex min-h-11 items-center font-heading text-lg font-bold tracking-tight text-primary"
      >
        LockedIn
      </Link>
      {user ? (
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/home" className="flex min-h-11 items-center px-2 font-medium hover:text-primary">
            Home
          </Link>
          <Link href="/profile" className="flex min-h-11 items-center px-2 font-medium hover:text-primary">
            Profile
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 items-center px-2 text-muted-foreground hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </nav>
      ) : (
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="flex min-h-11 items-center px-2 font-medium hover:text-primary">
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex min-h-11 items-center rounded-lg bg-primary px-4 font-medium text-on-primary hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}
