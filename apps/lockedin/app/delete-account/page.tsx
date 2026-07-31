import Link from "next/link";
import { createClient } from "@suite/auth/server";
import { deleteAccount } from "@/app/auth/actions";
import { SubmitButton } from "@suite/ui";
import { inputClass } from "@suite/ui";

export const metadata = {
  title: "Delete account — LockedIn",
  description: "Permanently delete your LockedIn account and all associated data.",
};

// Public page (no requireUser) — Play Store requires a web-reachable account
// deletion path that works without installing the app. Logged in: delete in
// one step. Logged out: explain, link to log in, offer the email fallback.
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Delete your account</h1>
        <p className="text-sm text-muted-foreground">This is permanent and takes effect immediately.</p>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed">
        Deleting your account permanently removes your profile, listings, posts,
        messages, group and club memberships, saved items, ratings, and
        notifications. Nothing is kept. This cannot be undone.
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {user ? (
        <form action={deleteAccount} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>. Type{" "}
            <span className="font-mono font-semibold">DELETE</span> to confirm.
          </p>
          <input aria-label="Type DELETE" name="confirm" required placeholder="Type DELETE" autoComplete="off" className={inputClass} />
          <SubmitButton pendingLabel="Deleting…" variant="destructive">
            Permanently delete my account
          </SubmitButton>
        </form>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            You&rsquo;re not signed in. Log in to delete your account in one step:
          </p>
          <Link
            href="/login"
            className="press flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-medium text-on-primary hover:bg-primary-strong"
          >
            Log in to continue
          </Link>
          <p className="text-muted-foreground">
            Can&rsquo;t log in? Email{" "}
            <a href="mailto:chiranjib.dash2024@vitstudent.ac.in" className="font-medium text-primary underline">
              chiranjib.dash2024@vitstudent.ac.in
            </a>{" "}
            from your college address and we&rsquo;ll delete it within 30 days.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        See the <Link href="/privacy" className="underline">Privacy Policy</Link> for what we store and why.
      </p>
    </main>
  );
}
