"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { createClient } from "@suite/auth/client";

// Chats tab with a realtime unread badge. Server seeds the initial count; a
// message subscription (RLS-filtered to my conversations) bumps it live. Zeroes
// when I'm on /chats.
export default function ChatTab({ meId, initialUnread }: { meId: string; initialUnread: number }) {
  const [count, setCount] = useState(initialUnread);
  const pathname = usePathname();
  const active = pathname.startsWith("/chats");
  // Being on /chats zeroes the badge — derived from the route, not synced into
  // state by an effect (react-hooks/set-state-in-effect).
  const shown = active ? 0 : count;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("nav-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { sender_id: string };
        // RLS already limits delivered rows to my conversations.
        if (m.sender_id !== meId && !window.location.pathname.startsWith("/chats")) {
          setCount((c) => c + 1);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  return (
    <Link
      href="/chats"
      aria-current={active ? "page" : undefined}
      className={`press relative flex min-h-11 flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? "font-semibold text-primary" : "text-muted-foreground"
      }`}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      Chats
      {shown > 0 && (
        <span className="absolute top-0 right-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-heading text-[10px] font-bold text-on-destructive">
          {shown > 9 ? "9+" : shown}
        </span>
      )}
    </Link>
  );
}
