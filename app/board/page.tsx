import { redirect } from "next/navigation";

// The searchable feed arrives in Phase 6. Until then, Board opens the composer.
export default function BoardIndex() {
  redirect("/board/new");
}
