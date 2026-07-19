import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Standard back affordance for secondary screens (forms, settings, sub-pages).
// Explicit href over router.back() so deep links and refreshes behave.
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="press -ml-1 flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      {label}
    </Link>
  );
}
