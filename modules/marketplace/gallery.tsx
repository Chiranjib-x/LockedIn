"use client";

import { useState } from "react";

// Simple tap-to-switch gallery with thumbnails. ponytail: no swipe gestures —
// thumbnails cover it; add touch-drag only if users ask.
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-muted text-5xl">
        📦
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={title} className="animate-scale-in h-full w-full object-cover" key={active} />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`press h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === active ? "border-primary" : "border-border"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
