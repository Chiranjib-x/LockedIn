import Link from "next/link";
import type { Metadata } from "next";
import { Megaphone, Search, Sparkles, CalendarDays, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import ShareLink from "@/modules/communities/share-link";

const DESC = "Market your club or student team and recruit members — without WhatsApp groups, QR codes, or phone numbers.";

export const metadata: Metadata = {
  title: "CampusClubs for Clubs",
  description: DESC,
  openGraph: {
    title: "CampusClubs for Clubs",
    description: DESC,
    type: "website",
  },
};

// Public (no auth) so it can be shared with club reps during outreach. The CTA
// sends them to propose their club; if not signed in they'll be asked to first.
const VALUE = [
  { Icon: Megaphone, tint: "bg-tint-rose text-tint-rose-fg", title: "Announce to every member", body: "Post once — all your members get notified instantly. No WhatsApp group to run." },
  { Icon: Sparkles, tint: "bg-tint-violet text-tint-violet-fg", title: "Collect interest, not numbers", body: "Booth visitors tap “I’m interested.” You get a private lead list to follow up — no phone numbers exchanged." },
  { Icon: Search, tint: "bg-tint-blue text-tint-blue-fg", title: "Found without a QR code", body: "Students search your club by name and join in-app. A handmade “find us on CampusClubs” poster is all you need." },
  { Icon: CalendarDays, tint: "bg-tint-amber text-tint-amber-fg", title: "Events that reach people", body: "Post an event and it lands with every member and on the campus events page." },
  { Icon: BarChart3, tint: "bg-tint-teal text-tint-teal-fg", title: "See what's working", body: "A live dashboard: members, weekly growth, interested leads, event check-ins." },
  { Icon: ShieldCheck, tint: "bg-tint-green text-tint-green-fg", title: "Verified students only", body: "Everyone here is a verified campus student — real audience, no spam accounts." },
];

export default function ForClubsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="animate-fade-up flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">CampusClubs for Clubs & Teams</p>
        <h1 className="text-3xl font-bold leading-tight">Market your club or team. Recruit members. All in one app.</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Quanta bans WhatsApp groups, QR codes, and collecting phone numbers. CampusClubs is the
          compliant way to reach students — announcements, recruiting, and leads, built in.
        </p>
        <div className="mt-2 flex justify-center">
          <Link
            href="/communities/new"
            className="press shine gradient-brand glow-primary flex min-h-12 items-center gap-2 rounded-full px-7 font-semibold text-on-primary"
          >
            Get your club on CampusClubs <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VALUE.map((v, i) => (
          <Card key={v.title} className="animate-fade-up flex flex-col gap-2" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${v.tint}`}>
              <v.Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="font-semibold">{v.title}</h2>
            <p className="text-sm text-muted-foreground">{v.body}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-3 bg-gradient-to-r from-primary/10 to-accent/5 py-6 text-center">
        <h2 className="text-lg font-bold">Bring your club to campus, digitally.</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Set it up in a minute — propose your club, get approved, and you’re its first moderator.
        </p>
        <Link
          href="/communities/new"
          className="press flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-on-primary hover:bg-primary-strong"
        >
          Start now <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Link>
        <Link href="/communities" className="text-sm font-medium text-primary hover:underline">
          Or browse clubs already here →
        </Link>
      </Card>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Share this with a club</p>
        <p className="text-xs text-muted-foreground">Send this page to a club owner — it opens for anyone, no login needed.</p>
        <div className="mt-1">
          <ShareLink path="/for-clubs" title="CampusClubs for Clubs" />
        </div>
      </div>
    </main>
  );
}
