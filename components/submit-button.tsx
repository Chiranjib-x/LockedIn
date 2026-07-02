"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables + shows a spinner while the server action runs,
// so a slow network can't produce double-submits and users get clear feedback.
// Same look as Button's primary/accent variants. Use inside any <form action>.
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "accent";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "accent"
      ? "shine bg-accent text-on-accent hover:opacity-90"
      : "shine bg-primary text-on-primary hover:bg-primary-strong";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70 ${styles} ${className}`}
    >
      {pending && (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {pending ? pendingLabel ?? "Working…" : children}
    </button>
  );
}
