// Read-only star display. Half-star via clip. ponytail: emoji stars, no icon lib.
export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const full = Math.round(value);
  return (
    <span className={size === "lg" ? "text-lg" : "text-sm"} aria-label={`${value.toFixed(1)} out of 5`}>
      <span className="text-amber-500">{"★".repeat(full)}</span>
      <span className="text-muted-foreground/40">{"★".repeat(5 - full)}</span>
    </span>
  );
}

// Rating summary for profiles/listings. Handles the no-ratings-yet state.
export function RatingBadge({ avg, count }: { avg: number | null; count: number }) {
  if (!count) {
    return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="font-semibold text-amber-500">★ {avg!.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}
