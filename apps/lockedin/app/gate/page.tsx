import Link from "next/link";
import { Footprints } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { ClaimButton, RunnerActions, RequesterActions, HeadingToGate, RunnerOptIn, RunnerNote } from "@/modules/gate/client";
import { EmptyState } from "@suite/ui";
import PushOptIn from "@/components/push-opt-in";

// Visual status timeline: Posted → Claimed → Dropped off → Received.
const STEPS = ["Posted", "Claimed", "Dropped off", "Received"];
function StatusSteps({ status, droppedOff }: { status: string; droppedOff: boolean }) {
  const at = status === "open" ? 0 : status === "claimed" ? (droppedOff ? 2 : 1) : 3;
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center">
            <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : i <= at ? "bg-accent" : "bg-border"}`} />
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i < at ? "bg-accent" : i === at ? "bg-accent ring-4 ring-accent/20" : "bg-border"}`} />
            <span className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "bg-transparent" : i < at ? "bg-accent" : "bg-border"}`} />
          </div>
          <span className={`text-[10px] leading-none ${i <= at ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function eta(ts: string) {
  const ms = new Date(ts).getTime() - Date.now();
  if (ms < -3600000) return "arrived earlier";
  if (ms < 0) return "arriving now";
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ~${m}m`;
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-accent/10 text-accent",
  claimed: "bg-primary/10 text-primary",
  delivered: "bg-muted text-muted-foreground",
};

type Row = {
  id: string;
  requester_id: string;
  runner_id: string | null;
  runner_upi: string | null;
  platform: string;
  item_desc: string;
  gate: string;
  drop_location: string;
  expected_at: string;
  reward: number;
  status: string;
  runner_note: string | null;
  delivered_claimed_at: string | null;
  requester: { name: string; hostel_block: string | null };
  runner: { name: string } | null;
};

export default async function GatePage() {
  const { supabase, user } = await requireUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("gate_alerts")
    .eq("id", user.id)
    .single();

  const { data } = await supabase
    .from("pickup_requests")
    .select(
      "*, requester:profiles!pickup_requests_requester_id_fkey(name, hostel_block), runner:profiles!pickup_requests_runner_id_fkey(name)"
    )
    .in("status", ["open", "claimed", "delivered"])
    .order("expected_at", { ascending: true })
    .limit(50);

  const rows = (data ?? []) as unknown as Row[];
  const mine = rows.filter((r) => r.requester_id === user.id || r.runner_id === user.id);
  const open = rows.filter((r) => r.status === "open" && r.requester_id !== user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gate pickups</h1>
        <Link
          href="/gate/new"
          className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-strong"
        >
          ＋ My delivery
        </Link>
      </div>

      <PushOptIn context="gate" />

      <RunnerOptIn enabled={me?.gate_alerts ?? false} />

      {mine.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Yours</h2>
          {mine.map((r) => {
            const iAmRequester = r.requester_id === user.id;
            return (
              <Card key={r.id} className="animate-fade-up flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status] ?? "bg-muted"}`}>
                    {r.status !== "delivered" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                    {r.status === "open" ? "Waiting for a runner" : r.status === "claimed" ? (iAmRequester ? `${r.runner?.name ?? "Someone"} is on it` : "You're on it") : "Delivered"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{eta(r.expected_at)}</span>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">{r.platform}</span> · {r.item_desc}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.gate} → {r.drop_location}
                  {r.reward > 0 && <> · ₹{Number(r.reward).toFixed(0)} reward</>}
                </p>
                {r.status !== "cancelled" && (
                  <StatusSteps status={r.status} droppedOff={r.delivered_claimed_at !== null} />
                )}
                {iAmRequester && r.runner_note && (
                  <p className="rounded-xl bg-primary/5 px-3 py-2 text-sm">
                    📝 <span className="font-medium">{r.runner?.name ?? "Runner"}:</span> {r.runner_note}
                  </p>
                )}
                {!iAmRequester && r.status === "claimed" && (
                  <RunnerNote id={r.id} current={r.runner_note} />
                )}
                <div className="flex flex-wrap gap-2">
                  {iAmRequester ? (
                    <RequesterActions
                      id={r.id}
                      status={r.status}
                      reward={Number(r.reward)}
                      runnerUpi={r.runner_upi}
                      runnerName={r.runner?.name ?? null}
                      droppedOff={r.delivered_claimed_at !== null}
                    />
                  ) : (
                    r.status === "claimed" && (
                      <RunnerActions id={r.id} droppedOff={r.delivered_claimed_at !== null} />
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Open at the gate</h2>
          <HeadingToGate gate="Main Gate" />
        </div>
        {!open.length ? (
          <EmptyState icon={Footprints} tint="green" title="Nothing waiting right now">
            <p className="text-sm text-muted-foreground">
              Heading to the gate? Check back — someone’s biryani always needs a hero.
            </p>
          </EmptyState>
        ) : (
          open.map((r) => (
            <Card key={r.id} className="animate-fade-up flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="glow-primary rounded-full bg-accent px-2.5 py-0.5 font-heading text-xs font-bold text-on-accent">
                  ₹{Number(r.reward).toFixed(0)} reward
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{eta(r.expected_at)}</span>
              </div>
              <p className="text-sm">
                <span className="font-semibold">{r.platform}</span> · {r.item_desc}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.gate} → {r.drop_location} · for {r.requester?.name}
              </p>
              <ClaimButton id={r.id} reward={Number(r.reward)} />
            </Card>
          ))
        )}
      </section>
    </main>
  );
}
