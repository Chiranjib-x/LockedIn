import { ShieldCheck } from "lucide-react";

// The unfakeable identity line — verified_name is derived from the college
// email by the signup trigger and pinned by migration 0036. Shown beneath
// display names in trust-critical spots (sellers, chats, matches, profile).
export default function VerifiedName({ name }: { name: string | null | undefined }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent" title="Name from college email — can't be edited">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
      {name}
    </span>
  );
}
