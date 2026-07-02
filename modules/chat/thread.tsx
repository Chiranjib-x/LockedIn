"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

const OPENERS = ["Is this still available?", "Can you do ₹___?", "Where can we meet?"];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Thread({
  conversationId,
  meId,
  initial,
  showOpeners,
  myContact,
}: {
  conversationId: string;
  meId: string;
  initial: Msg[];
  showOpeners: boolean;
  myContact: string | null;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  async function send(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    // optimistic
    const temp: Msg = { id: "temp-" + Date.now(), sender_id: meId, body: trimmed, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body: trimmed })
      .select()
      .single();
    setSending(false);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      alert(error.message);
    } else {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? (data as Msg) : m)));
    }
  }

  let lastDay = "";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">Say hi 👋</p>
        )}
        {messages.map((m) => {
          const day = dayLabel(m.created_at);
          const sep = day !== lastDay;
          lastDay = day;
          const mine = m.sender_id === meId;
          return (
            <div key={m.id}>
              {sep && (
                <div className="my-2 text-center text-xs text-muted-foreground">{day}</div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-[15px] ${
                    mine ? "rounded-br-sm bg-primary text-on-primary" : "rounded-bl-sm bg-card border border-border"
                  }`}
                >
                  {m.body}
                  <span className={`ml-2 align-bottom text-[10px] ${mine ? "text-on-primary/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showOpeners && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {OPENERS.map((o) => (
            <button key={o} onClick={() => send(o)} className="press rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted">
              {o}
            </button>
          ))}
        </div>
      )}

      <div className="glass sticky bottom-0 flex items-center gap-2 border-t border-border px-3 py-2">
        {myContact && (
          <button
            onClick={() => send(`📱 My contact: ${myContact}`)}
            title="Share my contact"
            className="press shrink-0 text-xl"
            aria-label="Share my contact"
          >
            📱
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
          placeholder="Message…"
          className="min-h-11 flex-1 rounded-full border border-border bg-background px-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
        <button
          onClick={() => send(text)}
          disabled={sending || !text.trim()}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
