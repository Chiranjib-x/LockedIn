import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CampusClubs — run your club, reach every member";

// Static branded card — this is what recipients see when the link is pasted into
// WhatsApp, Instagram, or a student group. Token values inlined (OG images render
// outside the CSS pipeline). Mirrors app/for-clubs/opengraph-image.tsx.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
          padding: 80,
          background: "linear-gradient(135deg, #7c3aed 0%, #4a1d94 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5, opacity: 0.9 }}>
          🎓 CampusClubs
        </div>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Run your club. Reach every member.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#e2d5fb", maxWidth: 880, lineHeight: 1.35 }}>
          Announcements, events, recruiting & check-in — no WhatsApp group to run.
        </div>
      </div>
    ),
    size
  );
}
