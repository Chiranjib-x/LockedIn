import { requireUser } from "@/lib/auth";
import { inputClass } from "@/components/ui";
import BackLink from "@/components/back-link";
import { SubmitButton } from "@/components/submit-button";
import { createOrder } from "@/modules/groupbuy/actions";

const CATEGORIES = ["Food", "Groceries", "Merch", "Prints", "Other"];

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href="/group-buy" label="Group-buys" />
      <h1 className="text-2xl font-bold">Start a group-buy</h1>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={createOrder} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What are you ordering?
          <input name="title" required placeholder="e.g. Dominos Wednesday BOGO" className={inputClass} />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Category
            <select name="category" required defaultValue="" className={inputClass}>
              <option value="" disabled>Pick one</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Per-unit price (₹) <span className="font-normal text-muted-foreground">optional</span>
            <input name="unit_price" type="number" min={0} step="0.5" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Joining deadline
          <input name="deadline" type="datetime-local" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your UPI ID <span className="font-normal text-muted-foreground">(for collecting shares — e.g. name@oksbi)</span>
          <input name="upi_id" placeholder="you@upi" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Details
          <textarea name="description" rows={3} placeholder="Cutoffs, delivery point, anything joiners should know…" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Opening…">Open for joining</SubmitButton>
      </form>
    </main>
  );
}
