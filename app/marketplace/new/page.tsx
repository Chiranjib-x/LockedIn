import { requireUser } from "@/lib/auth";
import ListingForm from "@/modules/marketplace/listing-form";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Post a listing</h1>
      <ListingForm error={error} />
    </main>
  );
}
