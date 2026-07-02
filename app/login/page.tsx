import Link from "next/link";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-bold">Log in</h1>
      {message && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <form action={login} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@vitstudent.ac.in"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Log in
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline">
          Sign up with your college email
        </Link>
      </p>
    </main>
  );
}
