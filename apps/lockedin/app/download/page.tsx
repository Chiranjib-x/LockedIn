import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Get the apps — LockedIn",
  description: "Download the LockedIn campus suite: LockedIn, GateRunner, CampusClubs, CampusTrade, and VIT Compass.",
};

// The LockedIn campus suite is several focused apps on one shared account. This
// hub is the single place to get any of them; each app links back here so a user
// on one app can always find the others. APK links fill in as each app is
// wrapped + released — until then an app shows its web link (works in any
// browser / installable as a PWA).
const APK_LOCKEDIN =
  "https://drive.usercontent.google.com/download?id=1op2TJaqNVHLGItbGA0M87hbfL8wzqVsJ&export=download&confirm=t";

type SuiteApp = { name: string; emoji: string; tagline: string; web: string; apk: string | null };

const APPS: SuiteApp[] = [
  { name: "LockedIn", emoji: "🔥", tagline: "The full campus super-app — everything in one place.", web: "https://www.chiranjib.online", apk: APK_LOCKEDIN },
  { name: "GateRunner", emoji: "🏃", tagline: "Your parcel, picked up at the gate by someone already walking there.", web: "https://gate.chiranjib.online", apk: null },
  { name: "CampusClubs", emoji: "🎓", tagline: "Run your club, chapter or team — recruiting, meetings, events, all in one.", web: "https://clubs.chiranjib.online", apk: null },
  { name: "CampusTrade", emoji: "🛍️", tagline: "Buy, sell & rent with verified students, plus daily campus life.", web: "https://trade.chiranjib.online", apk: null },
  { name: "VIT Compass", emoji: "🧭", tagline: "Find your way around VIT — every building, one tap away.", web: "https://map.chiranjib.online", apk: null },
];

export default function DownloadHub() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-10">
      <div>
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} /> Home
        </Link>
        <h1 className="text-3xl font-bold">Get the apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The LockedIn suite — one account across every app. Android APKs roll out per app; until
          then each opens in any browser (add to home screen to install).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {APPS.map((a) => (
          <div key={a.name} className="glass flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">
              {a.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-bold">{a.name}</h2>
              <p className="text-sm text-muted-foreground">{a.tagline}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {a.apk ? (
                <a
                  href={a.apk}
                  className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-strong"
                >
                  <Download className="h-4 w-4" strokeWidth={2.2} /> APK
                </a>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-xs font-medium text-muted-foreground">
                  APK soon
                </span>
              )}
              <a
                href={a.web}
                className="press inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-primary"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2.2} /> Open
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        iPhone? Open any app in Safari → Share → Add to Home Screen.
      </p>
    </main>
  );
}
