import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CarTaxiFront,
  Handshake,
  Mars,
  MessageCircle,
  ShoppingBag,
  Tv,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@suite/ui";

// Marketing pillars — campus-only Marketplace, built-in Chat, and the
// gender-specific members-only Spaces.
const PILLARS: {
  icon: LucideIcon;
  tint: string;
  title: string;
  body: string;
}[] = [
  {
    icon: ShoppingBag,
    tint: "bg-tint-blue text-tint-blue-fg",
    title: "Campus Marketplace",
    body: "Buy, sell, and rent only with verified students from your college. Haggle in chat, meet at the mess. No strangers, no scams.",
  },
  {
    icon: MessageCircle,
    tint: "bg-tint-violet text-tint-violet-fg",
    title: "Chat, Built In",
    body: "Haggle on listings, make offers, coordinate pickups — and every study group and group-buy gets its own room. Your number stays private until you choose to share it.",
  },
  {
    icon: Venus,
    tint: "bg-tint-rose text-tint-rose-fg",
    title: "Her Circle",
    body: "A verified women-only space to buy, sell, swap, and talk freely with others on campus — invisible to everyone else.",
  },
  {
    icon: Mars,
    tint: "bg-tint-blue text-tint-blue-fg",
    title: "His Circle",
    body: "A verified men-only space to buy, sell, swap, and talk freely with others on campus — invisible to everyone else.",
  },
  {
    icon: CarTaxiFront,
    tint: "bg-tint-amber text-tint-amber-fg",
    title: "Cab Pooling",
    body: "Airport run at 4 AM? Find students leaving the same day and split the fare instead of eating it alone.",
  },
  {
    icon: Handshake,
    tint: "bg-tint-violet text-tint-violet-fg",
    title: "Group-Buys",
    body: "One Domino's order, eight people, delivery fee split eight ways — with a live tracker for who's paid and where to collect.",
  },
  {
    icon: Tv,
    tint: "bg-tint-teal text-tint-teal-fg",
    title: "Netflix & Spotify Pools",
    body: "Share subscriptions with your floor and split the cost. Prorated joining, renewal countdowns, zero awkward reminders.",
  },
];

// The complete feature map, grouped the way students think about them.
// Every entry is a shipped feature — no vaporware on the front page.
const EVERYTHING: { group: string; items: { name: string; blurb: string }[] }[] = [
  {
    group: "Buy, sell & rent",
    items: [
      { name: "Marketplace", blurb: "Buy, sell, and rent with verified students from your own campus." },
      { name: "Make an offer", blurb: "Haggle right on the listing — offer, counter, deal at one tap." },
      { name: "Requests", blurb: "Can't find it? Post what you need and let campus come to you." },
      { name: "Rent & lend", blurb: "Per-day pricing, deposits, due-date reminders, auto-relist on return." },
      { name: "Student deals", blurb: "Curated offers from shops around campus." },
    ],
  },
  {
    group: "Split the cost",
    items: [
      { name: "Group-buys", blurb: "One order, one delivery fee, split between everyone who joins." },
      { name: "Netflix & Spotify pools", blurb: "Browse open seats, join mid-cycle at a prorated share." },
      { name: "Cab pooling", blurb: "4 AM airport run? Find students leaving the same day, split the fare." },
    ],
  },
  {
    group: "Your people",
    items: [
      { name: "Her Circle & His Circle", blurb: "Verified women-only and men-only spaces to buy, sell, swap and talk freely — invisible to everyone else." },
      { name: "Study groups", blurb: "Course-tagged groups with their own built-in group chat." },
      { name: "Roommate match", blurb: "Compatibility-scored matches — sleep schedule, tidiness, guests, all of it." },
      { name: "Crews", blurb: "Private groups for roommates & friends with shared to-dos." },
    ],
  },
  {
    group: "Daily drivers",
    items: [
      { name: "Timetable + bunk math", blurb: "One-tap attendance and the answer to \"can I skip today?\"" },
      { name: "Campus board", blurb: "Lost & found that auto-matches lost posts to found ones, plus notices." },
      { name: "Built-in chat", blurb: "DMs and group rooms with context — every deal, ride, and group has its thread." },
      { name: "Smart notifications", blurb: "Class nudges when your attendance is at risk, deal alerts, price drops." },
      { name: "Search & alerts", blurb: "One search across everything; save a search and get told when it appears." },
      { name: "Karma & ratings", blurb: "Good actors are visible — every deal builds your campus reputation." },
    ],
  },
  {
    group: "Locked down",
    items: [
      { name: "College email only", blurb: "Every single person here is a verified student of your college." },
      { name: "No phone numbers", blurb: "Usernames, not numbers. Your contact stays private until you share it." },
      { name: "Report & block everywhere", blurb: "Campus moderators act on reports; blocked people can't reach you." },
      { name: "Your college only", blurb: "Everything you post stays inside your campus — enforced at the database." },
    ],
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-16 text-center">
      {/* Atmosphere: two soft brand glows anchoring the composition */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
      />

      <p className="animate-fade-up flex items-center gap-2 font-heading text-sm font-bold tracking-widest uppercase">
        <LogoMark className="h-7 w-auto text-primary" />
        <span className="gradient-brand-text">CampusTrade</span>
      </p>
      <h1
        className="animate-fade-up mt-4 max-w-2xl text-5xl font-bold sm:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        Buy, sell, split.
        <br />
        <span className="gradient-brand-text">Campus only.</span>
      </h1>
      <p
        className="animate-fade-up mt-6 max-w-md text-lg text-muted-foreground"
        style={{ animationDelay: "160ms" }}
      >
        Verified students only. No outsiders. That&rsquo;s the point.
      </p>
      <Link
        href="/signup"
        className="animate-fade-up shine gradient-brand glow-primary mt-8 flex min-h-13 items-center gap-2 rounded-full px-8 font-semibold text-on-primary shadow-lg shadow-primary/25 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
        style={{ animationDelay: "240ms" }}
      >
        Get started <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
      </Link>

      <p
        className="animate-fade-up mt-3 text-sm font-medium text-foreground"
        style={{ animationDelay: "300ms" }}
      >
        Works in your browser. Nothing to install.
      </p>
      <p className="animate-fade-up mt-1 text-xs text-muted-foreground" style={{ animationDelay: "340ms" }}>
        Any phone, any laptop —{" "}
        <a href="/download" className="underline decoration-dotted hover:text-foreground">
          and an Android app if you&rsquo;d rather
        </a>
        .
      </p>

      {/* The three pillars */}
      <div className="mt-16 flex w-full max-w-md flex-col gap-4 text-left">
        {PILLARS.map((p, i) => (
          <div
            key={p.title}
            className="glass animate-fade-up press flex gap-4 rounded-3xl p-5"
            style={{ animationDelay: `${340 + i * 110}ms` }}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${p.tint}`}>
              <p.icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">{p.title}</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* The full feature map — everything above is the pitch, this is the receipt. */}
      <section className="mt-16 w-full max-w-md text-left">
        <h2 className="text-center font-heading text-2xl font-bold">
          Everything inside<span className="gradient-brand-text">.</span>
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          One app instead of eleven WhatsApp groups.
        </p>
        <div className="mt-6 flex flex-col gap-6">
          {EVERYTHING.map((g) => (
            <div key={g.group}>
              <h3 className="text-xs font-bold tracking-widest text-primary uppercase">{g.group}</h3>
              <div className="mt-2 flex flex-col gap-2">
                {g.items.map((f) => (
                  <div key={f.name} className="glass rounded-2xl px-4 py-3">
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.blurb}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA — same two actions as the hero, for people who read this far. */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <Link
          href="/signup"
          className="press shine gradient-brand glow-primary flex min-h-13 items-center gap-2 rounded-full px-8 font-semibold text-on-primary"
        >
          Sign up with your college email <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Link>
        <p className="text-xs text-muted-foreground">
          Opens straight in your browser ·{" "}
          <a href="/download" className="underline decoration-dotted hover:text-foreground">
            Android app
          </a>{" "}
          optional
        </p>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Part of the{" "}
        <a href="https://www.chiranjib.online" className="font-medium text-primary hover:underline">LockedIn</a>{" "}
        campus suite ·{" "}
        <a href="https://www.chiranjib.online/download" className="font-medium text-primary hover:underline">get the apps</a>
      </p>
      <p className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <a href="https://www.instagram.com/chiranjib_x/" target="_blank" rel="noopener noreferrer" className="hover:underline">Contact</a>
        <Link href="/delete-account" className="hover:underline">Delete account</Link>
      </p>
    </main>
  );
}
