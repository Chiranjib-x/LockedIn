import { requireUser } from "@/lib/auth";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createSubscription } from "@/modules/subscriptions/actions";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Create a pool</h1>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={createSubscription} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Service
          <input name="service_name" required placeholder="e.g. Netflix, Spotify, ChatGPT Plus" className={inputClass} />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Total cost (₹)
            <input name="total_cost" type="number" min={1} required className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Cycle
            <select name="billing_cycle" defaultValue="monthly" className={inputClass}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Next renewal
            <input name="renewal_date" type="date" required className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Seats
            <input name="seats" type="number" min={2} defaultValue={4} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your UPI ID <span className="font-normal text-muted-foreground">(members pay you here)</span>
          <input name="upi_id" placeholder="you@upi" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Creating…">Create pool</SubmitButton>
      </form>
    </main>
  );
}
