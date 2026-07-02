import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-4xl font-bold tracking-tight">LockedIn</h1>
      <p className="text-zinc-500">Your campus, one app.</p>
      <Link
        href="/signup"
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
      >
        Join with your college email
      </Link>
    </main>
  );
}
