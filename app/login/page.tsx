import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Button, inputClass } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-3xl font-bold">Log in</h1>
      {message && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <form action={login} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="you@vitstudent.ac.in" className={inputClass} />
        <input name="password" type="password" required placeholder="Password" className={inputClass} />
        <Button type="submit">Log in</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          Sign up with your college email
        </Link>
      </p>
    </main>
  );
}
