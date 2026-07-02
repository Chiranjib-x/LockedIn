"use client";

import { useState } from "react";

// Contact reveal. Phase 18 replaces this with in-app chat; for now it discloses
// the seller's chosen contact on tap (reveal is a choice, not auto-shown).
export default function ContactSeller({ contact }: { contact: string | null }) {
  const [shown, setShown] = useState(false);

  if (!contact) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        This seller hasn’t added a contact yet.
      </p>
    );
  }

  const wa = contact.replace(/[^\d]/g, "");
  const isPhone = wa.length >= 10;

  return shown ? (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">Contact</p>
      <p className="font-heading text-lg font-semibold">{contact}</p>
      {isPhone && (
        <a
          href={`https://wa.me/${wa.length === 10 ? "91" + wa : wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-1 flex min-h-11 items-center justify-center rounded-full bg-accent px-5 font-semibold text-on-accent"
        >
          Message on WhatsApp
        </a>
      )}
    </div>
  ) : (
    <button
      onClick={() => setShown(true)}
      className="press flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary shadow-lg shadow-primary/25"
    >
      Contact seller
    </button>
  );
}
