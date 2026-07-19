// Single source of truth for community type presentation. "group" drives the
// separate shelves on /communities: chapters, clubs, teams, and everything
// else (interest communities). is_official is orthogonal — a verification
// badge, not a type.
export const CATEGORY_META: Record<
  string,
  { label: string; emoji: string; group: "chapter" | "club" | "team" | "community" }
> = {
  chapter: { label: "Chapter", emoji: "🎖️", group: "chapter" },
  club: { label: "Club", emoji: "🎭", group: "club" },
  team: { label: "Team", emoji: "🚀", group: "team" },
  sports: { label: "Sports", emoji: "⚽", group: "community" },
  gaming: { label: "Gaming", emoji: "🎮", group: "community" },
  hobby: { label: "Hobby", emoji: "🎨", group: "community" },
  other: { label: "Community", emoji: "✨", group: "community" },
};

export function catLabel(cat: string) {
  return CATEGORY_META[cat]?.label ?? "Community";
}
export function catGroup(cat: string): "chapter" | "club" | "team" | "community" {
  return CATEGORY_META[cat]?.group ?? "community";
}
