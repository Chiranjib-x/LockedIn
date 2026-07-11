"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import ImageUpload from "@/components/image-upload";
import { createPost } from "./actions";

const TYPES = [
  { value: "lost", label: "Lost", emoji: "😿", hint: "Where did you last see it?" },
  { value: "found", label: "Found", emoji: "🎉", hint: "Where did you find it?" },
  { value: "notice", label: "Notice", emoji: "📢", hint: "Relevant place (optional)" },
  { value: "event", label: "Event", emoji: "🎪", hint: "Venue" },
] as const;

export default function PostForm({
  error,
  communityId,
  communityName,
}: {
  error?: string;
  communityId?: string;
  communityName?: string;
}) {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>(communityId ? "notice" : "lost");
  const [images, setImages] = useState<string[]>([]);
  const active = TYPES.find((t) => t.value === type)!;

  return (
    <form action={createPost} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      {communityId && <input type="hidden" name="community_id" value={communityId} />}

      {communityName && (
        <p className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary">
          Posting as {communityName}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`press flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm font-medium ${
              type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input
          name="title"
          required
          placeholder={
            type === "lost" ? "e.g. Black JBL earbuds" :
            type === "found" ? "e.g. Found: silver water bottle" :
            type === "notice" ? "e.g. Library timings changed" :
            "e.g. Open mic night"
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {type === "notice" ? "Location (optional)" : "Location"}
        <input name="location" placeholder={active.hint} className={inputClass} />
      </label>

      {type === "event" && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Event date & time
          <input name="event_date" type="datetime-local" required className={inputClass} />
        </label>
      )}

      {type === "found" && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Verification question (optional)
          <input
            name="claim_question"
            placeholder="e.g. What's engraved on the back?"
            className={inputClass}
          />
          <span className="text-xs font-normal text-muted-foreground">
            Claimants must answer this — only you see the answers.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Details
        <textarea
          name="description"
          rows={4}
          placeholder="Anything that helps — identifying marks, timings, contact hints…"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Photos
        <ImageUpload bucket="post-images" value={images} onChange={setImages} />
      </label>

      <SubmitButton pendingLabel="Posting…">Post to the board</SubmitButton>
    </form>
  );
}
