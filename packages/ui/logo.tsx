// LockedIn brand mark — flame with a keyhole, its shaft descending into key
// teeth ("ignition + security"). Strokes use currentColor so surfaces tint it
// via text-* classes, which is why this stays an inline SVG.
//
// The raster app icons are NO LONGER generated from this geometry: since
// 2026-07-29 they come from a supplied artwork master via
// `node scripts/make-icons.mjs`. Editing this file does not change the launcher
// or favicon — same concept, two independent assets.
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 60"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.8 4.6 C25.5 8.5 30.6 13.6 32.9 18.8 C34 21.5 34.6 23.9 34.6 26.3 C34.6 33 29.9 38.2 24 38.2 C18.1 38.2 13.4 33 13.4 26.3 C13.4 23.5 14.4 20.8 16 18.2 C17.8 15.2 19.7 12.4 20.3 9.3 C20.55 7.8 20.4 6.1 19.8 4.6 Z" />
      <circle cx="24" cy="21.5" r="4.2" />
      <path d="M24 25.7 V52" />
      <path d="M24 41.5 H30.5" />
      <path d="M24 47.5 H32.5" />
    </svg>
  );
}
