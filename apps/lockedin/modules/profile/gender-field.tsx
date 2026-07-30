"use client";

import { useState } from "react";
import { inputClass } from "@suite/ui";

// Optional gender on the profile.
//
// Inclusivity here means two specific things, not a longer list:
//   1. Self-describe is a real option, not an afterthought. Any fixed list
//      eventually fails someone and makes them pick a wrong answer about
//      themselves, so the stored column is free text (0087) and this is only a
//      set of shortcuts.
//   2. Answering is optional and un-answering is possible. Tapping the selected
//      chip again clears it. "Prefer not to say" is a deliberate answer and is
//      kept distinct from having left it blank.
//
// Nothing reads this to decide access to anything — see 0087's header.

const PRESETS = ["Woman", "Man", "Non-binary", "Prefer not to say"] as const;

export default function GenderField({ value }: { value: string | null }) {
  const preset = value != null && (PRESETS as readonly string[]).includes(value);
  const [choice, setChoice] = useState<string | null>(
    value == null ? null : preset ? value : "__custom"
  );
  const [custom, setCustom] = useState(preset || value == null ? "" : value);

  // What actually gets submitted. Empty string is stored as null server-side.
  const submitted = choice === "__custom" ? custom.trim() : (choice ?? "");

  const chip = (active: boolean) =>
    `press inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm ${
      active
        ? "border-primary bg-primary/10 font-semibold text-primary"
        : "border-border bg-card hover:border-primary/50"
    }`;

  return (
    <div className="flex flex-col gap-2 text-sm font-medium">
      <span>
        Gender{" "}
        <span className="font-normal text-muted-foreground">
          (optional — only you see this)
        </span>
      </span>

      <input type="hidden" name="gender" value={submitted} />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={choice === p}
            // Tapping the active chip clears the answer rather than trapping it.
            onClick={() => setChoice((c) => (c === p ? null : p))}
            className={chip(choice === p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={choice === "__custom"}
          onClick={() => setChoice((c) => (c === "__custom" ? null : "__custom"))}
          className={chip(choice === "__custom")}
        >
          Self-describe
        </button>
      </div>

      {choice === "__custom" && (
        <input
          autoFocus
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={40}
          placeholder="However you describe yourself"
          aria-label="Describe your gender"
          className={inputClass}
        />
      )}
    </div>
  );
}
