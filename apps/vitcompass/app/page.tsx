import { createAnonClient } from "@/lib/supabase";
import CampusMap, { type Building } from "@/components/campus-map";

// Buildings change via the moderator CMS, so don't cache the page.
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const supabase = createAnonClient();
  const { b: focusId } = await searchParams;

  // VIT Compass is VIT-specific; scope to VIT Vellore's college row.
  const { data: college } = await supabase
    .from("colleges")
    .select("id")
    .eq("email_domain", "vitstudent.ac.in")
    .single();

  let buildings: Building[] = [];
  if (college) {
    const { data } = await supabase
      .from("campus_buildings")
      .select("id, name, aka, category, description, lat, lng, near_landmark")
      .eq("college_id", college.id)
      .order("sort_order");
    // The map can only place buildings that have coordinates.
    buildings = (data ?? []).filter((b) => b.lat != null && b.lng != null) as Building[];
  }

  return <CampusMap buildings={buildings} focusId={focusId} />;
}
