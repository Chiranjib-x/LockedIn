"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Downscale to <=1280px longest side + re-encode JPEG — typically 3–5x smaller,
// stretching the storage quota. Also strips EXIF (incl. GPS geotags) as a side
// effect. Falls back to the original file on any failure or if it isn't smaller.
async function compressImage(file: File): Promise<Blob> {
  const MAX = 1280;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// Reusable multi-image uploader. Uploads to a Storage bucket under {uid}/...,
// reports the resulting public URLs via onChange. Reused by Lost & Found later.
// ponytail: no crop/reorder yet — add when a module needs it.
export default function ImageUpload({
  bucket = "listing-images",
  value,
  onChange,
  max = 5,
}: {
  bucket?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - value.length;
    if (room <= 0) {
      setError(`Up to ${max} images.`);
      return;
    }
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setBusy(false);
      return;
    }

    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 25 * 1024 * 1024) {
        setError("That image is too large to process.");
        continue;
      }
      const source = await compressImage(file);
      // After downscaling a phone photo is well under this; only a giant that
      // failed to compress trips it.
      if (source.size > 5 * 1024 * 1024) {
        setError("Each image must be under 5 MB.");
        continue;
      }
      const compressed = source !== file;
      const ext = compressed ? "jpg" : file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, source, { cacheControl: "3600", contentType: compressed ? "image/jpeg" : file.type });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      uploaded.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    }
    onChange([...value, ...uploaded]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
    // ponytail: leaves the storage object orphaned; a nightly sweep or the
    // delete-listing flow can prune. Not worth a round-trip on every remove.
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="press absolute top-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-xs text-white"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < max && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="press flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground disabled:opacity-50"
            >
              {busy ? <span className="shimmer h-full w-full rounded-lg" /> : <><span className="text-xl">🖼️</span>Gallery</>}
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="press flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground disabled:opacity-50"
            >
              <span className="text-xl">📷</span>Camera
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {/* capture forces the camera in webviews/mobile browsers; single shot by design */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
