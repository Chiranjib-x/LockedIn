"use client";

import { useState } from "react";
import ImageUpload from "@/components/image-upload";

// Single-logo uploader that feeds a hidden input inside a server-rendered form
// (used by the propose form). Reuses the public post-images bucket.
export default function LogoField({ name = "logo_url" }: { name?: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-1">
      <input type="hidden" name={name} value={urls[0] ?? ""} />
      <ImageUpload bucket="post-images" value={urls} onChange={setUrls} max={1} />
      <span className="text-xs font-normal text-muted-foreground">
        Optional — a square logo looks best. Skip it and your emoji is used.
      </span>
    </div>
  );
}
