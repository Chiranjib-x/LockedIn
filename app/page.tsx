import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Footprints,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
    icon: Sparkles,
    tint: "bg-tint-rose text-tint-rose-fg",
    title: "Girls' Closet · Boys' Den",
    body: "Members-only spaces that are invisible to everyone else. Sell that dress or that GPU inside your own circle — vouched entry only.",
  },
];

const ALSO = [
  "Lost & found",
  "Group-buys",
  "Cab pooling",
  "Split subscriptions",
  "Roommate match",
  "Study groups",
  "Timetable & bunk math",
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

      <p className="animate-fade-up gradient-brand-text font-heading text-sm font-bold tracking-widest uppercase">
        LockedIn
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
        style={{ animationDelay: "700ms" }}
      >
        Also inside: {ALSO.join(" · ")}
      </p>
      <Link
        href="/signup"
        className="animate-fade-up mt-6 text-sm font-semibold text-primary hover:underline"
        style={{ animationDelay: "760ms" }}
      >
        Sign up with your college email →
      </Link>
    </main>
  );
}
