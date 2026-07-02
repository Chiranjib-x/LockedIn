import Link from "next/link";

// Base UI conventions every module reuses. Colors come from the design tokens
// in globals.css — never hardcode hex here. Touch targets min 44px (min-h-11).
// ponytail: one file, three primitives — split into components/ui/ if this grows past ~5.

export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent";
}) {
  const styles = {
    primary: "bg-primary text-on-primary hover:bg-primary-strong",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    accent: "bg-accent text-on-accent hover:opacity-90",
  }[variant];
  return (
    <button
      className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// Shared form input style — Phase 1 pages use it, later module forms will too.
export const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";
