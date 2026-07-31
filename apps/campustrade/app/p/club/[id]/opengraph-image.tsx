import { ImageResponse } from "next/og";
import { createClient } from "@suite/auth/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LockedIn club";

// OG images render outside the CSS pipeline, so token values are inlined
// (cream #f6f5f1, ink #0b0b0d, cobalt #2251C7) — same rationale as offline.html.
//
// This card is the actual payload when a secretary pastes their club link into a
// WhatsApp group: the chat renders this image, not the URL. It is the difference
// between a link that looks like spam and one that looks like the club.
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: {
    name: string;
    emoji: string | null;
    description: string | null;
    logo_url: string | null;
    recruiting: boolean;
    college_name: string;
  } | null = null;
  try {
    const supabase = await createClient();
    ({ data: p } = await supabase.rpc("public_club_preview", { cid: id }).maybeSingle());
  } catch {
    // fall through to the brand-only card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f6f5f1",
          color: "#0b0b0d",
          fontFamily: "sans-serif",
        }}
      >
        {p?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logo_url} alt="" width={630} height={630} style={{ objectFit: "cover" }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
            padding: 56,
            flex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#2251C7" }}>
            LockedIn
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>
            {p
              ? `${p.emoji ?? ""} ${p.name.length > 48 ? p.name.slice(0, 45) + "…" : p.name}`.trim()
              : "Your campus, one app."}
          </div>
          {p?.description && (
            <div style={{ display: "flex", fontSize: 28, color: "#3a3d44", lineHeight: 1.3 }}>
              {p.description.length > 110 ? p.description.slice(0, 107) + "…" : p.description}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 26, color: "#6b6e76" }}>
            {p
              ? `${p.recruiting ? "Recruiting now · " : ""}${p.college_name}`
              : "Verified students only"}
          </div>
        </div>
      </div>
    ),
    size
  );
}
