import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Bottom tab bar per docs/design/directions.png: Home · Explore · [+] · Chats ·
// Profile. Explore lights up with global search (Phase 27), [+] with the first
// create flow (Phase 3), Chats with Phase 18.
export default async function BottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dead = "flex min-h-11 flex-col items-center justify-center gap-0.5 text-muted-foreground/50";
  const live = "flex min-h-11 flex-col items-center justify-center gap-0.5 text-foreground";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-center border-t border-border bg-card/95 px-2 pt-1 pb-2 text-[11px] font-medium backdrop-blur">
      <Link href="/home" className={live}>
        <span className="text-xl leading-none">🏠</span>
        Home
      </Link>
      <span className={dead} title="Coming soon">
        <span className="text-xl leading-none grayscale opacity-50">🧭</span>
        Explore
      </span>
      <span className="flex items-center justify-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl leading-none text-on-primary opacity-40"
          title="Coming soon"
        >
          +
        </span>
      </span>
      <span className={dead} title="Coming soon">
        <span className="text-xl leading-none grayscale opacity-50">💬</span>
        Chats
      </span>
      <Link href="/profile" className={live}>
        <span className="text-xl leading-none">👤</span>
        Profile
      </Link>
    </nav>
  );
}
