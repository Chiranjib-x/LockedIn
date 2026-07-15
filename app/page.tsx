import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CarTaxiFront,
  Download,
  Footprints,
  Gamepad2,
  Handshake,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LogoMark from "@/components/logo";

// Marketing pillars — the three features that sell the app (user-directed):
// Gate Runner (nothing else has it), campus-only Marketplace, and the
// gender-specific members-only Spaces.
const PILLARS: {
  icon: LucideIcon;
  tint: string;
  title: string;
  body: string;
}[] = [
  {
    icon: Footprints,
    tint: "bg-tint-green text-tint-green-fg",
    title: "Gate Runner",
    body: "Your Swiggy's at the gate. Someone's already walking there — they grab it, you reward them. Everyone wins.",
  },
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
    icon: Sparkles,
    tint: "bg-tint-rose text-tint-rose-fg",
    title: "Girls' Closet",
    body: "That lehenga you wore once? Rent it out for the next fest. Dresses, jewellery, heels — rented and sold between girls only, invisible to everyone else.",
  },
  {
    icon: Gamepad2,
    tint: "bg-tint-blue text-tint-blue-fg",
    title: "Boys' Den",
    body: "A boys-only space no one else can see. Rent out the console between sems, sell the keyboard you never use, flip cricket kits and GPU upgrades.",
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

const ALSO = [
  "Lost & found",
  "Roommate match",
  "Study groups",
  "Timetable & bunk math",
  "Campus communities",
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
        <span className="gradient-brand-text">LockedIn</span>
      </p>
      <h1
        className="animate-fade-up mt-4 max-w-2xl text-5xl font-bold sm:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        Your campus,
        <br />
        <span className="gradient-brand-text">one app.</span>
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

      <a
        href="/download"
        className="animate-fade-up mt-3 flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-6 text-sm font-semibold backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:border-primary"
        style={{ animationDelay: "300ms" }}
      >
        <Download className="h-4 w-4" strokeWidth={2.2} /> Download the Android app
      </a>
      <p className="animate-fade-up mt-1.5 text-xs text-muted-foreground" style={{ animationDelay: "340ms" }}>
        Android APK · iPhone? Open in Safari → Share → Add to Home Screen
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

      <p
        className="animate-fade-up mt-10 max-w-md text-xs leading-relaxed text-muted-foreground"
        style={{ animationDelay: "1110ms" }}
      >
        Also inside: {ALSO.join(" · ")}
      </p>
      <Link
        href="/signup"
        className="animate-fade-up mt-6 text-sm font-semibold text-primary hover:underline"
        style={{ animationDelay: "1170ms" }}
      >
        Sign up with your college email →
      </Link>

      <p className="mt-8 flex gap-4 text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/delete-account" className="hover:underline">Delete account</Link>
      </p>
    </main>
  );
}
