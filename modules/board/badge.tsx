// Type badge — token colors only.
const STYLES: Record<string, string> = {
  lost: "bg-destructive/10 text-destructive",
  found: "bg-accent/10 text-accent",
  notice: "bg-primary/10 text-primary",
  event: "bg-secondary text-on-secondary",
};

const LABELS: Record<string, string> = {
  lost: "Lost",
  found: "Found",
  notice: "Notice",
  event: "Event",
};

export default function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[type] ?? "bg-muted"}`}>
      {LABELS[type] ?? type}
    </span>
  );
}
