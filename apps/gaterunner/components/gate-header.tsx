import Link from "next/link";
import { Footprints } from "lucide-react";
import { createClient } from "@suite/auth/server";
import { logout } from "@/app/auth/actions";

// Single-purpose app: a slim header with the wordmark and (when signed in) a
// logout action. No bottom nav — the whole app is one screen.
export default async function GateHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="glass sticky top-0 z-10 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-2.5">
      <Link href={user ? "/gate" : "/"} className="flex min-h-11 items-center gap-2 font-heading text-lg font-bold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-tint-green text-tint-green-fg">
          <Footprints className="h-4 w-4" strokeWidth={2.4} />
        </span>
        Gate Runner
      </Link>
      {user ? (
        <form action={logout}>
          <button type="submit" className="press flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Log out
          </button>
        </form>
      ) : (
        <Link href="/login" className="flex min-h-11 items-center px-2 text-sm font-medium hover:text-primary">
          Log in
        </Link>
      )}
    </header>
  );
}
