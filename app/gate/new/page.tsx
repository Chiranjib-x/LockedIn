import { requireUser } from "@/lib/auth";
import { Button, inputClass } from "@/components/ui";
import { createPickup } from "@/modules/gate/actions";

const PLATFORMS = ["Zomato", "Swiggy", "Amazon", "Flipkart", "Blinkit", "Other"];

export default async function NewPickupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Get it picked up</h1>
      <p className="text-sm text-muted-foreground">
        Someone already heading to the gate grabs your delivery. You reward them — everyone wins.
      </p>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <form action={createPickup} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Platform
            <select name="platform" required defaultValue="" className={inputClass}>
              <option value="" disabled>Pick one</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Reward (₹)
            <input name="reward" type="number" min={0} defaultValue={20} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          What should they look for?
          <input name="item_desc" required placeholder="e.g. Zomato bag, order ends 4321, name Chiranjib" className={inputClass} />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Gate
            <input name="gate" defaultValue="Main Gate" className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Arriving around
            <input name="expected_at" type="datetime-local" required className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Bring it to
          <input name="drop_location" required placeholder="e.g. K Block entrance" className={inputClass} />
        </label>
        <Button type="submit">Post pickup request</Button>
      </form>
    </main>
  );
}
