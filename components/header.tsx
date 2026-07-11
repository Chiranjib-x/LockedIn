import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

async function NotificationBell({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}
      className="press relative flex min-h-11 min-w-11 items-center justify-center text-lg"
    >
      🔔
      {(count ?? 0) > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-heading text-[10px] font-bold text-on-destructive">
          {count! > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prof } = user
    ? await supabase.from("profiles").select("is_moderator, is_banned").eq("id", user.id).single()
    : { data: null };

  return (
    <>
    {prof?.is_banned && (
      <div className="bg-destructive px-4 py-2 text-center text-sm font-medium text-on-destructive">
        Your account is restricted — you can browse but can’t post or message. Contact an admin if this is a mistake.
      </div>
    )}
    <header className="glass sticky top-0 z-10 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-2">
      <Link
        href="/"
        className="flex min-h-11 items-center font-heading text-lg font-bold tracking-tight"
      >
        LockedIn
      </Link>
      {user ? (
        <nav className="flex items-center gap-1">
          {prof?.is_moderator && (
            <>
              <Link href="/admin/moderation" aria-label="Moderation" className="press flex min-h-11 min-w-11 items-center justify-center text-lg">
                🛡️
              </Link>
              <Link href="/admin/showcase" aria-label="Toolbox and Deals admin" className="press flex min-h-11 min-w-11 items-center justify-center text-lg">
                🧰
              </Link>
            </>
          )}
          <Link href="/search" aria-label="Search" className="press flex min-h-11 min-w-11 items-center justify-center text-lg">
            🔍
          </Link>
          <NotificationBell supabase={supabase} userId={user.id} />
          <LogoutButton />
        </nav>
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
    </>
  );
}
