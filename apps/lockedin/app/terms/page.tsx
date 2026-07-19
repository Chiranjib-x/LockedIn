import Link from "next/link";

export const metadata = {
  title: "Terms of Service — LockedIn",
  description: "The rules for using LockedIn.",
};

// Public page (no requireUser) — structure mirrors app/privacy/page.tsx.
const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "Who can use LockedIn",
    body: [
      "You need an email address from a registered college domain. Accounts are personal — one per student, under your real identity.",
      "You must be a current student (or staff) of that college. If you leave, you may keep browsing but should delete your account when it no longer represents you.",
    ],
  },
  {
    h: "Your content",
    body: [
      "You own what you post — listings, board posts, messages, photos. By posting, you let us display it inside your college as the feature intends.",
      "No prohibited content: anything illegal, harassment or hate, scams or misleading listings, other people's personal information, sexually explicit material, or spam.",
      "Moderators can remove content and restrict accounts that break these rules. Use the in-app Report button — reports go to your college's moderators.",
    ],
  },
  {
    h: "Marketplace, payments, and meetups",
    body: [
      "Deals happen directly between students. LockedIn is the notice board, not a party to any transaction — we don't process payments, hold money, or guarantee items.",
      "UPI payments go straight from student to student. Verify what you're buying before paying; meet in public campus spots.",
      "Ratings exist so good actors are visible. Don't manipulate them.",
    ],
  },
  {
    h: "What gets you banned",
    body: [
      "Faking your identity or impersonating others, evading a block or ban, harassing anyone, repeated scam reports, using the app for anything illegal.",
      "Bans are decided by college moderators. Banned accounts can browse but can't post or message.",
    ],
  },
  {
    h: "Leaving",
    body: [
      "Delete your account any time at /delete-account (also in your Profile). Deletion is immediate and permanent.",
    ],
  },
  {
    h: "The fine print",
    body: [
      "The app is provided as-is, free of charge, by a student. We work hard on reliability but can't promise uninterrupted service or accept liability for losses from using it — including deals that go wrong between users.",
      "We may update these terms as the app grows; the date below always reflects the current version.",
      "Questions: chiranjib.dash2024@vitstudent.ac.in",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 py-8">
      <div>
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">LockedIn · last updated 15 July 2026</p>
      </div>
      <p className="text-[15px] text-foreground/90">
        The short version: be a real student, be decent to people, deals are
        between you and the other student, and moderators can act when someone
        isn&rsquo;t decent.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.h}</h2>
          {s.body.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-muted-foreground">
              {line}
            </p>
          ))}
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        See also the{" "}
        <Link href="/privacy" className="font-medium text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
