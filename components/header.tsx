import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
      <Link href="/" className="text-lg font-bold tracking-tight">
        LockedIn
      </Link>
      {user ? (
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/home" className="font-medium hover:underline">
            Home
          </Link>
          <Link href="/profile" className="font-medium hover:underline">
            Profile
          </Link>
          <form action={logout}>
            <button type="submit" className="text-zinc-500 hover:underline">
              Log out
            </button>
          </form>
        </nav>
      ) : (
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="font-medium hover:underline">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}
