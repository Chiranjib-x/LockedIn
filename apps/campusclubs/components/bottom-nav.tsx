import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@suite/auth/server";
import NavLink from "@/components/nav-link";

// CampusClubs bottom tab bar: Home (command center) · Clubs (discover) · [+]
// start a club · Events · Profile. Chat lives in CampusTrade, not here.
export default async function BottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 items-center rounded-3xl px-2 pt-1 pb-2 text-[11px] font-medium">
      <NavLink href="/home" icon="home" label="Home" />
      <NavLink href="/communities" icon="clubs" label="Clubs" />
      <span className="flex items-center justify-center">
        <Link
          href="/communities/new"
          className="press gradient-brand glow-primary flex h-12 w-12 items-center justify-center rounded-full text-on-primary shadow-lg shadow-primary/30"
          aria-label="Start a club"
        >
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </Link>
      </span>
      <NavLink href="/events" icon="events" label="Events" />
      <NavLink href="/profile" icon="profile" label="Profile" />
    </nav>
  );
}
