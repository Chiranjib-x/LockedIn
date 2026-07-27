"use client";

import { useState } from "react";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import ImageUpload from "@/components/image-upload";
import { createPost } from "./actions";

const TYPE_META: Record<string, { label: string; emoji: string; hint: string }> = {
  lost: { label: "Lost", emoji: "😿", hint: "Where did you last see it?" },
  found: { label: "Found", emoji: "🎉", hint: "Where did you find it?" },
  notice: { label: "Notice", emoji: "📢", hint: "Relevant place (optional)" },
  event: { label: "Event", emoji: "🎪", hint: "Venue" },
};

// Which post types each surface offers. Clubs post updates (notice) or events;
// the plain board is lost/found/notice; /events/new is event only.
const TYPE_SETS: Record<string, string[]> = {
  board: ["lost", "found", "notice"],
  community: ["notice", "event"],
  event: ["event"],
};

export default function PostForm({
  error,
  communityId,
  communityName,
  kind = "board",
  buildings = [],
}: {
  error?: string;
  communityId?: string;
  communityName?: string;
  kind?: "board" | "event" | "community";
  /** Campus buildings for the venue picker — events only (QUEUE A34). */
  buildings?: { id: string; name: string; aka: string | null }[];
}) {
  const shown = TYPE_SETS[kind] ?? TYPE_SETS.board;
  const [type, setType] = useState<string>(shown[0]);
  const [images, setImages] = useState<string[]>([]);

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

      {shown.length > 1 && (
        <div className={`grid gap-2 ${shown.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {shown.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`press flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm font-medium ${
                type === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
              }`}
            >
              <span className="text-xl">{TYPE_META[t].emoji}</span>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}

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
        {type === "notice" ? "Location (optional)" : type === "event" ? "Venue" : "Location"}
        <input name="location" placeholder={TYPE_META[type].hint} className={inputClass} />
      </label>

      {type === "event" && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Event date & time
            <input name="event_date" type="datetime-local" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Capacity <span className="font-normal text-muted-foreground">(optional — extra RSVPs go on a waitlist)</span>
            <input name="capacity" type="number" min={1} placeholder="e.g. 60" className={inputClass} />
          </label>
          {buildings.length > 0 && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Building{" "}
              <span className="font-normal text-muted-foreground">
                (optional — puts your event on the campus map)
              </span>
              <select name="building_id" defaultValue="" className={inputClass}>
                <option value="">Not on campus / not listed</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.aka ? ` (${b.aka})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
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

      <SubmitButton pendingLabel="Posting…">{kind === "event" ? "Post the event" : "Post to the board"}</SubmitButton>
    </form>
  );
}
