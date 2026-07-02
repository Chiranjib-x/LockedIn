"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Chats tab with a realtime unread badge. Server seeds the initial count; a
// message subscription (RLS-filtered to my conversations) bumps it live. Zeroes
// when I'm on /chats.
export default function ChatTab({ meId, initialUnread, className }: { meId: string; initialUnread: number; className: string }) {
  const [count, setCount] = useState(initialUnread);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/chats")) setCount(0);
  }, [pathname]);

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
    <Link href="/chats" className={`${className} relative`}>
      <span className="text-xl leading-none">💬</span>
      Chats
      {count > 0 && (
        <span className="absolute top-0 right-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-heading text-[10px] font-bold text-on-destructive">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
