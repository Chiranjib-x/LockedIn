import { tierFor } from "./tiers";

// Compact karma badge shown next to names everywhere identity appears.
export function KarmaBadge({ karma, showPoints = false }: { karma: number; showPoints?: boolean }) {
  const tier = tierFor(karma);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
      title={`${karma} karma · ${tier.name}`}
    >
      <span>{tier.emoji}</span>
      <span>{showPoints ? `${karma}` : tier.name}</span>
    </span>
  );
}
