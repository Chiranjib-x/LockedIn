"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleUser, Compass, Home, Users, type LucideIcon } from "lucide-react";

// Icon is a string key mapped here (not a component prop) because BottomNav is
// a server component and component functions can't cross the RSC boundary.
const ICONS: Record<string, LucideIcon> = {
  home: Home,
  explore: Compass,
  clubs: Users,
  events: CalendarDays,
  profile: CircleUser,
};

// Bottom-nav tab that highlights when its route is active, so users always know
// which tab they're on. aria-current pairs the visual state with a semantic one.
export default function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: keyof typeof ICONS;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const Icon = ICONS[icon] ?? Home;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex min-h-11 flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? "font-semibold text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
