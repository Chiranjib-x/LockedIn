import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">🧭</span>
      <h1 className="text-2xl font-bold">Nothing here</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn’t exist — or you don’t have access to it.
      </p>
      <Link
        href="/home"
        className="press flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-on-primary"
      >
        Back home
      </Link>
    </main>
  );
}
