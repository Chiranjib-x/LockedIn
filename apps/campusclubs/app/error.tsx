"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">😵</span>
      <h1 className="text-2xl font-bold">Something broke</h1>
      <p className="text-sm text-muted-foreground">Not you — us. Try again in a second.</p>
      <button
        onClick={reset}
        className="press flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-on-primary"
      >
        Retry
      </button>
    </main>
  );
}
