import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Footprints, IndianRupee, ShieldCheck } from "lucide-react";
import { createClient } from "@suite/auth/server";

const POINTS = [
  { Icon: Footprints, tint: "bg-tint-green text-tint-green-fg", title: "Someone's already going", body: "Your Swiggy or parcel stops at the main gate. A student already walking there grabs it on the way." },
  { Icon: IndianRupee, tint: "bg-tint-amber text-tint-amber-fg", title: "A small reward", body: "Set a tip. They pick it up, you confirm you got it, you send the reward over UPI. Everyone wins." },
  { Icon: ShieldCheck, tint: "bg-tint-blue text-tint-blue-fg", title: "Verified students only", body: "College email to join — every runner and requester is a real student on your campus. No outsiders." },
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/gate");

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-14 text-center">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
      <span className="animate-fade-up flex h-16 w-16 items-center justify-center rounded-3xl bg-tint-green text-tint-green-fg">
        <Footprints className="h-8 w-8" strokeWidth={2.2} />
      </span>
      <h1 className="animate-fade-up mt-5 max-w-md text-4xl font-bold sm:text-5xl" style={{ animationDelay: "80ms" }}>
        Your parcel,
        <br />
        <span className="text-accent">picked up at the gate.</span>
      </h1>
      <p className="animate-fade-up mt-5 max-w-sm text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
        Stuck in class? Someone heading to the gate grabs your delivery. Verified students only.
      </p>
      <Link
        href="/signup"
        className="animate-fade-up shine gradient-brand glow-primary mt-8 flex min-h-13 items-center gap-2 rounded-full px-8 font-semibold text-on-primary shadow-lg shadow-primary/25"
        style={{ animationDelay: "240ms" }}
      >
        Get started <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
      </Link>

      <div className="mt-14 flex w-full max-w-md flex-col gap-4 text-left">
        {POINTS.map((p, i) => (
          <div key={p.title} className="glass animate-fade-up flex gap-4 rounded-3xl p-5" style={{ animationDelay: `${300 + i * 100}ms` }}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${p.tint}`}>
              <p.Icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">{p.title}</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/login" className="animate-fade-up mt-8 text-sm font-semibold text-primary hover:underline" style={{ animationDelay: "620ms" }}>
        Already have an account? Log in →
      </Link>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Part of the{" "}
        <a href="https://www.chiranjib.online" className="font-medium text-primary hover:underline">LockedIn</a>{" "}
        campus suite ·{" "}
        <a href="https://www.chiranjib.online/download" className="font-medium text-primary hover:underline">get the apps</a>
      </p>
    </main>
  );
}
