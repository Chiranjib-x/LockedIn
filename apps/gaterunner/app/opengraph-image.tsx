import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Gate Runner — your parcel, picked up at the gate";

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
          background: "linear-gradient(135deg, #16a34a 0%, #0b5f2b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5, opacity: 0.9 }}>
          🏃 Gate Runner
        </div>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Your parcel, picked up at the gate.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#c8ecd4", maxWidth: 880, lineHeight: 1.35 }}>
          By a student already walking there. Skip the round trip.
        </div>
      </div>
    ),
    size
  );
}
