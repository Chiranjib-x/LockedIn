import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChatTab from "@/modules/chat/chat-tab";
import { unreadChatCount } from "@/modules/chat/unread";
import NavLink from "@/components/nav-link";

// Bottom tab bar per docs/design/directions.png: Home · Explore · [+] · Chats ·
// Profile. Explore lights up with global search (Phase 27), [+] with the first
// create flow (Phase 3), Chats with Phase 18.
export default async function BottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const unread = await unreadChatCount(supabase, user.id);

  const dead = "flex min-h-11 flex-col items-center justify-center gap-0.5 text-muted-foreground/60";

  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 items-center rounded-3xl px-2 pt-1 pb-2 text-[11px] font-medium">
      <NavLink href="/home" emoji="🏠" label="Home" />
      <span className={dead} title="Coming soon">
        <span className="text-xl leading-none opacity-60 grayscale">🧭</span>
        Explore
      </span>
      <span className="flex items-center justify-center">
        <Link
          href="/marketplace/new"
          className="press flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl leading-none text-on-primary shadow-lg shadow-primary/30"
          aria-label="Post a listing"
        >
          +
        </Link>
      </span>
      <ChatTab meId={user.id} initialUnread={unread} />
      <NavLink href="/profile" emoji="👤" label="Profile" />
    </nav>
  );
}
