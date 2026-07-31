import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@suite/auth/server";
import { LogoMark } from "@suite/ui";

// Marketing pillars — the four things that make CampusClubs worth switching
// from WhatsApp + Google Forms + spreadsheets.
const PILLARS: { icon: LucideIcon; tint: string; title: string; body: string }[] = [
  {
    icon: LayoutDashboard,
    tint: "bg-tint-blue text-tint-blue-fg",
    title: "One command center",
    body: "Every application, position, meeting and broadcast in one place. Leads open the app and see exactly what needs them — nothing buried in a group chat.",
  },
  {
    icon: ClipboardList,
    tint: "bg-tint-violet text-tint-violet-fg",
    title: "Recruiting, not Google Forms",
    body: "Custom application questions, one-tap review, and positions you assign to members. No spreadsheets, no lost DMs, no “fill this form” link.",
  },
  {
    icon: CalendarCheck,
    tint: "bg-tint-green text-tint-green-fg",
    title: "Meetings that run themselves",
    body: "Schedule meetings, take roll-call, and let the app find the one hour your whole team is actually free. Dues, tasks and resources live right beside them.",
  },
  {
    icon: ScanLine,
    tint: "bg-tint-amber text-tint-amber-fg",
    title: "Events + barcode check-in",
    body: "Publish events, collect RSVPs, and scan college IDs at the door for a live attendee roster you can export.",
  },
];

// The complete feature map, grouped the way club leads think about them.
const EVERYTHING: { group: string; items: { name: string; blurb: string }[] }[] = [
  {
    group: "Run the club",
    items: [
      { name: "Command center", blurb: "Pending applications, today's meetings and unpaid dues — surfaced the moment you open the app." },
      { name: "Applications & recruiting", blurb: "Custom questions, one-tap accept/reject, and an applicant pipeline." },
      { name: "Positions & roles", blurb: "Lead assigns titles and powers to members — editable any time." },
      { name: "Roster & analytics", blurb: "Who's in, who's active, and how your club is growing." },
      { name: "Announcements & scheduled posts", blurb: "Broadcast to members now, or schedule it to go out later." },
    ],
  },
  {
    group: "Meet & organize",
    items: [
      { name: "Meetings + roll-call", blurb: "Schedule, notify, and take attendance in two taps." },
      { name: "Free-window finder", blurb: "The app finds the one hour your whole team is free." },
      { name: "Tasks & resources", blurb: "Assign to-dos and keep shared links and files in one place." },
      { name: "Polls", blurb: "Quick decisions without a 40-message thread." },
    ],
  },
  {
    group: "Money & gear",
    items: [
      { name: "Dues & collections", blurb: "Track who's paid, chase who hasn't — with UPI built in." },
      { name: "Funds", blurb: "A running ledger of the club's money, visible to the people who should see it." },
      { name: "Inventory & boxes", blurb: "Name a box, list what's inside, and update it every time something goes in or out." },
    ],
  },
  {
    group: "Official & verified",
    items: [
      { name: "Official club badges", blurb: "Recognised clubs stand apart from casual communities." },
      { name: "Chapters with branch groups", blurb: "IEEE CS, ACM-W and more get their own spaces under the parent chapter." },
      { name: "Student teams", blurb: "Racing, robotics and project teams get a home built for how they work." },
      { name: "College email only", blurb: "Every member is a verified student of your college — enforced at the database." },
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
        <span className="gradient-brand-text">CampusClubs</span>
      </p>
      <h1
        className="animate-fade-up mt-4 max-w-2xl text-5xl font-bold sm:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        Run your club,
        <br />
        <span className="gradient-brand-text">all in one place.</span>
      </h1>
      <p
        className="animate-fade-up mt-6 max-w-md text-lg text-muted-foreground"
        style={{ animationDelay: "160ms" }}
      >
        For every club, chapter, team and society on campus. Verified students only.
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

      <section className="mt-16 w-full max-w-md text-left">
        <h2 className="text-center font-heading text-2xl font-bold">
          Everything a club needs<span className="gradient-brand-text">.</span>
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          One app instead of a WhatsApp group, a Google Form and three spreadsheets.
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
        <a href="https://www.lockedincampus.online" className="font-medium text-primary hover:underline">LockedIn</a>{" "}
        campus suite ·{" "}
        <a href="https://www.lockedincampus.online/download" className="font-medium text-primary hover:underline">get the apps</a>
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
