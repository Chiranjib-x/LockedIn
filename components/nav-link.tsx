"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom-nav tab that highlights when its route is active, so users always know
// which tab they're on. aria-current pairs the visual state with a semantic one.
export default function NavLink({
  href,
  emoji,
  label,
}: {
  href: string;
  emoji: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex min-h-11 flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? "font-semibold text-primary" : "text-muted-foreground"
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      {label}
    </Link>
  );
}
