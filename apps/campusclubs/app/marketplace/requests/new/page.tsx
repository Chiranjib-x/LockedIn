import { requireUser } from "@/lib/auth";
import { BackLink } from "@suite/ui";
import RequestForm from "@/modules/requests/request-form";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; space?: string }>;
}) {
  const { supabase } = await requireUser();
  const { error, space } = await searchParams;

  // RLS returns only spaces the user belongs to.
  const { data: spaces } = await supabase.from("spaces").select("id, name, emoji");

  return (
    <main className="animate-fade-up mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href={space ? `/spaces/${space}` : "/marketplace/requests"} label="Back" />
      <h1 className="text-2xl font-bold">Request something</h1>
      <RequestForm
        error={error}
        spaces={spaces ?? []}
        defaultSpaceId={space && spaces?.some((s) => s.id === space) ? space : undefined}
      />
    </main>
  );
}
