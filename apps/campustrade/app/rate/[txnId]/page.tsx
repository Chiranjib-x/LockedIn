import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import RateForm from "@/modules/ratings/rate-form";

const CONTEXT_LABEL: Record<string, string> = {
  marketplace: "marketplace deal",
  group_buy: "group-buy",
  subscription: "subscription pool",
  pickup: "gate pickup",
};

export default async function RatePage({ params }: { params: Promise<{ txnId: string }> }) {
  const { supabase, user } = await requireUser();
  const { txnId } = await params;

  const { data: txn } = await supabase
    .from("transactions")
    .select("*, a:profiles!transactions_party_a_fkey(id, name), b:profiles!transactions_party_b_fkey(id, name)")
    .eq("id", txnId)
    .single();
  if (!txn) notFound();

  const a = txn.a as { id: string; name: string };
  const b = txn.b as { id: string; name: string };
  if (user.id !== a.id && user.id !== b.id) notFound();
  const other = user.id === a.id ? b : a;

  // Already rated?
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("transaction_id", txnId)
    .eq("rater_id", user.id)
    .maybeSingle();

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Rate {other.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your {CONTEXT_LABEL[txn.context_type] ?? "deal"}</p>
      </div>
      {existing ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <span className="text-3xl">👍</span>
          <p className="mt-2 font-medium">You’ve already rated this deal.</p>
        </div>
      ) : (
        <RateForm transactionId={txnId} rateeId={other.id} rateeName={other.name} />
      )}
    </main>
  );
}
