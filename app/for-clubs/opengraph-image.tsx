import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LockedIn for Clubs";

// Static branded card — this is what recipients see when the /for-clubs link is
// pasted into WhatsApp, email, Instagram, etc. Token values inlined (OG images
// render outside the CSS pipeline).
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
          background: "linear-gradient(135deg, #2251C7 0%, #14357f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5, opacity: 0.9 }}>
          LockedIn
        </div>
        <div style={{ display: "flex", alignSelf: "flex-start", fontSize: 24, fontWeight: 600, color: "#bfe3c9", background: "#2fbf6f33", borderRadius: 999, padding: "8px 24px" }}>
          For Clubs
        </div>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Market your club. Recruit members.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#d6e0f5", maxWidth: 880, lineHeight: 1.35 }}>
          Announcements, recruiting & interest leads — no WhatsApp groups, QR codes, or phone numbers.
        </div>
      </div>
    ),
    size
  );
}
