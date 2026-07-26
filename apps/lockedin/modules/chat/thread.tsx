"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

const OPENERS = ["Is this still available?", "Can you do ₹___?", "Where can we meet?"];

// FINDINGS F1: compare IST calendar days, not the render tz. This component is
// SSR'd on Vercel (UTC) before it hydrates on an IST device, so a bare
// toDateString() labelled anything sent 00:00-05:30 IST as the previous day.
const istKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
function dayLabel(iso: string) {
  const key = istKey(new Date(iso));
  const now = new Date();
  if (key === istKey(now)) return "Today";
  if (key === istKey(new Date(now.getTime() - 86400000))) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export default function Thread({
  conversationId,
  meId,
  initial,
  showOpeners,
  senderNames = null,
}: {
  conversationId: string;
  meId: string;
  initial: Msg[];
  showOpeners: boolean;
  // present only in multi-party threads (Phase 34) — keys are user ids
  senderNames?: Record<string, string> | null;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
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
      setText(trimmed); // give the draft back instead of losing it
      setSendError("Couldn’t send — check your connection and try again.");
    } else {
      setSendError(null);
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? (data as Msg) : m)));
    }
  }


  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">Say hi 👋</p>
        )}
        {messages.map((m, i) => {
          const day = dayLabel(m.created_at);
          const sep = day !== (i > 0 ? dayLabel(messages[i - 1].created_at) : "");
          const mine = m.sender_id === meId;
          return (
            <div key={m.id}>
              {sep && (
                <div className="my-2 text-center text-xs text-muted-foreground">{day}</div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-[15px] ${
                    mine ? "gradient-brand rounded-br-sm text-on-primary" : "rounded-bl-sm border border-border bg-card"
                  }`}
                >
                  {!mine && senderNames != null && (
                    <p className="text-xs font-semibold text-primary">{senderNames[m.sender_id] ?? "Student"}</p>
                  )}
                  {m.body}
                  <span className={`ml-2 align-bottom text-[10px] ${mine ? "text-on-primary/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
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

      {sendError && (
        <p className="px-4 pb-1 text-xs text-destructive" role="alert">
          {sendError}
        </p>
      )}
      <div className="glass sticky bottom-0 flex items-center gap-2 border-t border-border px-3 py-2">
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
          className="press gradient-brand glow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-primary disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
