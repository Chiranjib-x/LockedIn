"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Call the returned fn right after an onClick-driven server action resolves.
// Bare onClick handlers aren't wrapped in a React transition, so the action's
// revalidatePath() marks the cache dirty but never re-renders the mounted RSC
// tree — the page looks stale until a manual reload. router.refresh() forces
// that refetch. (Form actions and redirect()s don't need this; they already
// refresh.)
export function useRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}
