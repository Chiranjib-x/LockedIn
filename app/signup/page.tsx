import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-bold">Sign up</h1>
      <p className="text-sm text-zinc-500">
        Only registered college email domains can join — that&apos;s what keeps
        every buyer, roommate, and organizer a verified student.
      </p>
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <form action={signup} className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
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
          minLength={8}
          placeholder="Password (min 8 characters)"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Create account
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
