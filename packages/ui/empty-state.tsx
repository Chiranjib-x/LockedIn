import type { LucideIcon } from "lucide-react";
import { Card } from "./ui";

// Unified empty state (REVAMP-PLAN Phase 5): tinted icon blob + title + wit.
// Tint keys match the home-tile hues so each module keeps its colour identity.
const TINTS: Record<string, string> = {
  blue: "bg-tint-blue text-tint-blue-fg",
  green: "bg-tint-green text-tint-green-fg",
  amber: "bg-tint-amber text-tint-amber-fg",
  rose: "bg-tint-rose text-tint-rose-fg",
  violet: "bg-tint-violet text-tint-violet-fg",
  teal: "bg-tint-teal text-tint-teal-fg",
};

export default function EmptyState({
  icon: Icon,
  tint = "blue",
  title,
  children,
}: {
  icon: LucideIcon;
  tint?: keyof typeof TINTS;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="animate-scale-in mt-2 flex flex-col items-center gap-3 py-10 text-center">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ${TINTS[tint]}`}>
        <Icon className="h-8 w-8" strokeWidth={1.8} />
      </span>
      <p className="font-medium">{title}</p>
      {children}
    </Card>
  );
}
