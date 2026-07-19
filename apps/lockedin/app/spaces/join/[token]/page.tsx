import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";

// Invite redemption (0027). The RPC owns every check (exists / unused /
// unexpired / same college / inviter still a member / not already in) and
// returns { space_id } on success or { error } with the reason.
export default async function JoinSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { token } = await params;
  const { error } = await searchParams;

  async function accept() {
    "use server";
    const { supabase } = await requireUser();
    const { data, error: rpcError } = await supabase.rpc("redeem_space_invite", { t: token });
    const result = (data ?? {}) as { space_id?: string; error?: string };
    if (rpcError || result.error != null) {
      redirect(
        `/spaces/join/${token}?error=` +
          encodeURIComponent(result.error ?? "Something went wrong — try again.")
      );
    }
    redirect(`/spaces/${result.space_id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-12">
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="text-3xl">🤝</span>
        <h1 className="text-xl font-bold">You’ve been vouched for</h1>
        {error != null ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Link
              href="/home"
              className="press mt-2 flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-semibold"
            >
              Back home
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Someone trusts you enough to invite you into a members-only space.
            </p>
            <form action={accept}>
              <button
                type="submit"
                className="press flex min-h-12 items-center rounded-full bg-primary px-8 font-semibold text-on-primary shadow-lg shadow-primary/25"
              >
                Accept the invite
              </button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
