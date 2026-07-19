// Route-level loading skeletons. Shapes match the two real layouts:
// stacked cards (feeds/lists) and a 2-col grid (marketplace).
export function SkeletonList() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-6">
      <div className="shimmer h-8 w-40 rounded-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="shimmer h-24 rounded-2xl" />
      ))}
    </main>
  );
}

// A single feed section's loading placeholder — used while a /home section
// streams in behind its own Suspense boundary.
export function SkeletonSection() {
  return (
    <div className="flex flex-col gap-2">
      <div className="shimmer h-5 w-32 rounded-full" />
      <div className="shimmer h-20 rounded-2xl" />
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="shimmer h-8 w-40 rounded-full" />
      <div className="shimmer h-11 rounded-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="shimmer aspect-square rounded-2xl" />
            <div className="shimmer h-4 w-3/4 rounded-full" />
            <div className="shimmer h-4 w-1/3 rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
