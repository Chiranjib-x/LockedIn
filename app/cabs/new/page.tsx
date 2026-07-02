import { requireUser } from "@/lib/auth";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createTrip } from "@/modules/cabs/actions";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Post a trip</h1>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={createTrip} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            From
            <input name="origin" required placeholder="e.g. Campus gate" className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            To
            <input name="destination" required placeholder="e.g. Airport" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Departure time
          <input name="depart_at" type="datetime-local" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Seats available <span className="font-normal text-muted-foreground">(for others, not counting you)</span>
          <input name="seats" type="number" min={1} required defaultValue={3} className={inputClass} />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Total fare (₹) <span className="font-normal text-muted-foreground">optional</span>
            <input name="fare_total" type="number" min={0} step="1" className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Your UPI ID <span className="font-normal text-muted-foreground">optional</span>
            <input name="upi_id" placeholder="you@upi" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Notes
          <textarea name="notes" rows={3} placeholder="Pickup point, luggage space, anything joiners should know…" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Posting…">Post trip</SubmitButton>
      </form>
    </main>
  );
}
