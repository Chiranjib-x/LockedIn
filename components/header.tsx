import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="glass sticky top-0 z-10 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-2">
      <Link
        href="/"
        className="flex min-h-11 items-center font-heading text-lg font-bold tracking-tight"
      >
        LockedIn
      </Link>
      {user ? (
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Log out
          </button>
        </form>
      ) : (
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="flex min-h-11 items-center px-2 font-medium hover:text-primary">
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary hover:bg-primary-strong"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}
