import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";

// ponytail: hardcoded one-off event window, delete after 2026-07-18
const QUANTA_START = new Date("2026-07-13T00:00:00+05:30").getTime();
const QUANTA_END = new Date("2026-07-19T00:00:00+05:30").getTime();

function isQuantaWeek() {
  const now = Date.now();
  return now >= QUANTA_START && now < QUANTA_END;
}

export default function QuantaBanner() {
  if (!isQuantaWeek()) return null;

  return (
    <Link href="/communities" className="animate-fade-up press">
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">Quanta 2026 · 13–18 July</p>
            <h2 className="font-semibold">Clubs & Chapters Exhibition is on</h2>
            <p className="text-sm text-muted-foreground">Find every club’s stall and page here</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
        </div>
      </Card>
    </Link>
  );
}
