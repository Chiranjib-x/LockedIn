import { TIERS, tierFor } from "./tiers";

// Progress to the next tier — shown on the owner's own profile.
export function KarmaProgress({ karma }: { karma: number }) {
  const current = tierFor(karma);
  const next = [...TIERS].reverse().find((t) => t.min > karma);
  if (!next) {
    return (
      <p className="text-xs text-muted-foreground">
        {current.emoji} {karma} karma — top tier. Campus royalty.
      </p>
    );
  }
  const span = next.min - current.min;
  const pct = Math.min(100, Math.round(((karma - current.min) / span) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="gradient-brand glow-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {next.min - karma} karma to {next.emoji} {next.name}
      </p>
    </div>
  );
}
