import { notFound } from "next/navigation";
import { requireUser } from "@suite/auth/auth";
import { Card } from "@suite/ui";
import { BuildingForm, BuildingRow, type Building } from "@/modules/campus/admin-client";
import CampusMapEditor, { type EditorBuilding } from "@/modules/campus/map-editor";

// Moderator CMS for the VIT Compass campus map. Buildings are public-read but
// only a college moderator can edit them (definer RPCs enforce it server-side).
export default async function CampusAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_moderator, college_id")
    .eq("id", user.id)
    .single();
  if (!prof?.is_moderator) notFound();

  const { error } = await searchParams;

  const { data: buildings } = await supabase
    .from("campus_buildings")
    .select("id, name, aka, category, description, lat, lng, near_landmark, coords_verified")
    .eq("college_id", prof.college_id)
    .order("sort_order");

  const list = (buildings ?? []) as Building[];
  const missing = list.filter((b) => b.lat == null || b.lng == null).length;
  const unverified = (buildings ?? []).filter((b) => !b.coords_verified).length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Campus map</h1>
        <p className="text-sm text-muted-foreground">
          Buildings shown in VIT Compass — {list.length} total
          {missing > 0 && <> · {missing} without coordinates</>}
          {unverified > 0 && <> · {unverified} unconfirmed</>}.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {list.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Position the pins</h2>
          <CampusMapEditor buildings={(buildings ?? []) as EditorBuilding[]} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a building</h2>
        <Card>
          <BuildingForm />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">All buildings</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buildings yet — add the first one above.</p>
        ) : (
          list.map((b) => <BuildingRow key={b.id} building={b} />)
        )}
      </section>
    </main>
  );
}
