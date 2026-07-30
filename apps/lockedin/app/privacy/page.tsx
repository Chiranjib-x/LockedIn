import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — LockedIn",
  description: "How LockedIn collects, uses, and protects your data.",
};

// Public page (no requireUser) — Play Store requires a reachable privacy
// policy URL. Structure matched to not-found.tsx / p/ share pages.
const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "What we collect",
    body: [
      "Account: your college email address, name, and hostel/room details you choose to add.",
      "Content you create: marketplace listings, board posts, chat messages, group-buy orders, study groups, ratings, and photos you upload.",
      "Push tokens: a device token if you enable notifications, used only to deliver them.",
      "We do not collect your location, contacts, or anything from outside the app.",
    ],
  },
  {
    h: "How we use it",
    body: [
      "To run the app: showing your listings to your campus, delivering chats, sending notifications you opted into.",
      "Your data is visible only within your own college — every record is scoped to your campus and enforced at the database level.",
      "We do not sell your data, show ads, or share data with third parties for marketing.",
    ],
  },
  {
    h: "Where it lives",
    body: [
      "Data is stored with Supabase (hosted on AWS) and the app is served via Vercel.",
      "Chats and personal details are protected by row-level security: other students see only what the feature is designed to show them.",
    ],
  },
  {
    h: "Deleting your data",
    body: [
      "You can delete your own listings, posts, and messages in the app at any time.",
      "Delete your whole account instantly at lockedincampus.online/delete-account (also linked from your Profile). It permanently removes your profile and everything attached to it, immediately.",
      "Can't log in? Email us from your college address and we will remove it within 30 days.",
    ],
  },
  {
    h: "Contact",
    body: [
      "Fastest: message @chiranjib_x on Instagram — instagram.com/chiranjib_x",
      "Questions or deletion requests: chiranjib.dash2024@vitstudent.ac.in",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 py-8">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">LockedIn · last updated 12 July 2026</p>
      </div>
      <p className="text-[15px] text-foreground/90">
        LockedIn is a campus app for students, made by a student. The short version: we store
        only what the app needs to work, it stays inside your college, and we never sell it.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.h}</h2>
          {s.body.map((p) => (
            <p key={p} className="text-sm text-foreground/80">
              {p}
            </p>
          ))}
        </section>
      ))}
      <Link href="/" className="text-sm font-medium text-primary">
        ← Back to LockedIn
      </Link>
    </main>
  );
}
