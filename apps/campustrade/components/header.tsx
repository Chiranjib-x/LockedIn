import Link from "next/link";
import { Bell, Search, ShieldCheck, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme-toggle";
import LogoMark from "@/components/logo";

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
      className="press relative flex min-h-11 min-w-11 items-center justify-center text-foreground/70 hover:text-foreground"
    >
      <Bell className="h-5 w-5" strokeWidth={2} />
      {(count ?? 0) > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-heading text-[10px] font-bold text-on-destructive">
          {count! > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

// Avatar chip per docs/design/directions.png — initials + karma badge, links to
// Profile (which now owns Log out; also fixes the ≤380px header overflow).
function AvatarChip({ name, karma }: { name: string | null; karma: number }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return (
    <Link href="/profile" aria-label="Your profile" className="press relative ml-1 flex min-h-11 items-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-heading text-sm font-bold text-primary">
        {initials}
      </span>
      <span className="glow-primary absolute -right-1.5 -bottom-0.5 rounded-full bg-primary px-1.5 py-px font-heading text-[9px] font-bold text-on-primary">
        {karma}
      </span>
    </Link>
  );
}

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prof } = user
    ? await supabase
        .from("profiles")
        .select("name, karma, is_moderator, is_banned")
        .eq("id", user.id)
        .single()
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
        className="flex min-h-11 items-center gap-1.5"
      >
        <LogoMark className="h-6 w-auto shrink-0 text-primary" />
        {/* tiny screens keep the mark only — a moderator's 6 header icons overflow 360px otherwise */}
        <span className="gradient-brand-text hidden font-heading text-lg font-bold tracking-tight min-[400px]:inline">CampusTrade</span>
      </Link>
      {user ? (
        <nav className="flex items-center">
          {prof?.is_moderator && (
            <>
              <Link href="/admin/moderation" aria-label="Moderation" className="press flex min-h-11 min-w-11 items-center justify-center text-foreground/70 hover:text-foreground">
                <ShieldCheck className="h-5 w-5" strokeWidth={2} />
              </Link>
              <Link href="/admin/showcase" aria-label="Toolbox and Deals admin" className="press flex min-h-11 min-w-11 items-center justify-center text-foreground/70 hover:text-foreground">
                <Wrench className="h-5 w-5" strokeWidth={2} />
              </Link>
            </>
          )}
          <ThemeToggle />
          <Link href="/search" aria-label="Search" className="press flex min-h-11 min-w-11 items-center justify-center text-foreground/70 hover:text-foreground">
            <Search className="h-5 w-5" strokeWidth={2} />
          </Link>
          <NotificationBell supabase={supabase} userId={user.id} />
          <AvatarChip name={prof?.name ?? null} karma={prof?.karma ?? 0} />
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
