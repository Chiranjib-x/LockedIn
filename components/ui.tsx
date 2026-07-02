import Link from "next/link";

// Base UI conventions every module reuses. ponytail: one file, three primitives —
// split into components/ui/ if this grows past ~5.

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-4 ${className}`}>
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
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-700"
      : "border border-zinc-300 text-zinc-900 hover:bg-zinc-50";
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${styles} ${className}`}
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
          <Link href={action.href} className="text-sm font-medium text-zinc-500 hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
