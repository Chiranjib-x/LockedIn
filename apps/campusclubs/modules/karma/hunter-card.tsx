import { TIERS, tierFor } from "./tiers";
import CountUp from "@/components/count-up";
import VerifiedName from "@/components/verified-name";
import { RatingBadge } from "@/modules/ratings/stars";

// "Hunter License" — the identity card at the top of Profile (REVAMP-PLAN
// Phase 1). Glass ID card: rank-ring avatar, karma count-up, tier chip.
// Ring shows progress to the next tier; top tier rides at 100%.
export default function HunterCard({
  name,
  verifiedName,
  detail,
  karma,
  rating,
}: {
  name: string;
  verifiedName?: string | null;
  detail: string;
  karma: number;
  rating: { avg: number | null; count: number };
}) {
  const tier = tierFor(karma);
  const next = [...TIERS].reverse().find((t) => t.min > karma);
  const pct = next ? Math.min(1, (karma - tier.min) / (next.min - tier.min)) : 1;

  const R = 34;
  const C = 2 * Math.PI * R;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";

  return (
    <div className="glass animate-scale-in flex items-center gap-4 rounded-3xl p-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="rank-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-violet)" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--color-muted)" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="url(#rank-ring)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${C * pct} ${C}`}
          />
        </svg>
        <span className="absolute inset-2.5 flex items-center justify-center rounded-full bg-secondary font-heading text-xl font-bold text-primary">
          {initials}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold">{name}</h1>
        <VerifiedName name={verifiedName} />
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="glow-primary rounded-full bg-secondary px-2.5 py-0.5 font-heading text-xs font-bold text-primary">
            {tier.emoji} {tier.name}
          </span>
          <RatingBadge avg={rating.avg} count={rating.count} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <CountUp value={karma} className="gradient-brand-text font-heading text-3xl font-bold" />
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">karma</p>
      </div>
    </div>
  );
}
