import LogoMark from "@/components/logo";

// Shared brand hero for the auth pages — the first screens anyone sees.
// Theme-aware: warm cream in light, "System window" over the mesh in dark.
export default function AuthHero({ tagline }: { tagline: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <LogoMark className="animate-fade-up h-16 w-auto text-primary" />
      <p
        className="animate-fade-up gradient-brand-text font-heading text-5xl font-bold tracking-tight"
        style={{ animationDelay: "40ms" }}
      >
        LockedIn
      </p>
      <p className="animate-fade-up text-sm font-medium text-muted-foreground" style={{ animationDelay: "140ms" }}>
        {tagline}
      </p>
    </div>
  );
}
