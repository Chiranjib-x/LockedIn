import { CalendarDays, CheckCircle2, Megaphone, Search, type LucideIcon } from "lucide-react";

// Type badge — icon + tint per type (REVAMP-PLAN Phase 2), token colors only.
const KINDS: Record<string, { label: string; cls: string; Icon: LucideIcon }> = {
  lost: { label: "Lost", cls: "bg-tint-rose text-tint-rose-fg", Icon: Search },
  found: { label: "Found", cls: "bg-tint-green text-tint-green-fg", Icon: CheckCircle2 },
  notice: { label: "Notice", cls: "bg-tint-blue text-tint-blue-fg", Icon: Megaphone },
  event: { label: "Event", cls: "bg-tint-violet text-tint-violet-fg", Icon: CalendarDays },
};

export default function TypeBadge({ type }: { type: string }) {
  const kind = KINDS[type];
  if (!kind) {
    return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{type}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${kind.cls}`}>
      <kind.Icon className="h-3 w-3" strokeWidth={2.4} />
      {kind.label}
    </span>
  );
}
