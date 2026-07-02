import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-3xl font-bold">Sign up</h1>
      <p className="text-sm text-muted-foreground">
        Only registered college email domains can join — that’s what keeps
        every buyer, roommate, and organizer a verified student.
      </p>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <form action={signup} className="flex flex-col gap-3">
        <input name="name" type="text" required autoComplete="name" placeholder="Your name" className={inputClass} />
        <input name="email" type="email" required autoComplete="email" placeholder="you@vitstudent.ac.in" className={inputClass} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Password (min 8 characters)"
          className={inputClass}
        />
        <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
