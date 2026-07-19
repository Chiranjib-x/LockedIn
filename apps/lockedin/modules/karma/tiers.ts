// Badge tiers — keep thresholds in sync with karma_tier() in migration 0012.
export const TIERS = [
  { min: 400, name: "Campus Legend", emoji: "👑" },
  { min: 150, name: "Trusted", emoji: "💎" },
  { min: 50, name: "Active", emoji: "⚡" },
  { min: 0, name: "New", emoji: "🌱" },
] as const;

export function tierFor(karma: number) {
  return TIERS.find((t) => karma >= t.min)!;
}
