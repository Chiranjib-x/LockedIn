import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Button, inputClass } from "@/components/ui";

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
        <input name="name" type="text" required placeholder="Your name" className={inputClass} />
        <input name="email" type="email" required placeholder="you@vitstudent.ac.in" className={inputClass} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          className={inputClass}
        />
        <Button type="submit">Create account</Button>
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
