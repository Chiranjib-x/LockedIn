import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackLink } from "@suite/ui";
import ListingForm from "@/modules/marketplace/listing-form";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).single();
  if (!listing || listing.seller_id !== user.id) redirect("/marketplace/mine");

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href={`/marketplace/${id}`} label="Listing" />
      <h1 className="text-2xl font-bold">Edit listing</h1>
      <ListingForm listing={listing} error={error} />
    </main>
  );
}
