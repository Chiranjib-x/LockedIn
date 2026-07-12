"use client";

import { useState } from "react";
import { PackageOpen } from "lucide-react";

// Simple tap-to-switch gallery with thumbnails + dot indicators. ponytail: no
// swipe gestures — thumbnails cover it; add touch-drag only if users ask.
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-tint-blue to-tint-teal">
        <PackageOpen className="h-14 w-14 text-tint-blue-fg/60" strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={title} className="animate-scale-in h-full w-full object-cover" key={active} />
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {images.map((src, i) => (
              <span
                key={src}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "glow-primary w-5 bg-primary" : "w-1.5 bg-card/70"
                }`}
              />
            ))}
          </div>
        )}
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
