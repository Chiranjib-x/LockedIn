import { ImageResponse } from "next/og";
import { createClient } from "@suite/auth/server";
import { rupees } from "@/modules/marketplace/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LockedIn listing";

// OG images render outside the CSS pipeline, so token values are inlined
// (cream #f6f5f1, ink #0b0b0d, cobalt #2251C7) — same rationale as offline.html.
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: { title: string; price: number; category: string; image: string | null; college_name: string } | null = null;
  try {
    const supabase = await createClient();
    ({ data: p } = await supabase.rpc("public_listing_preview", { lid: id }).maybeSingle());
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
        {p?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" width={630} height={630} style={{ objectFit: "cover" }} />
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
            {p ? (p.title.length > 60 ? p.title.slice(0, 57) + "…" : p.title) : "Your campus, one app."}
          </div>
          {p && (
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#16a34a" }}>
              {rupees(Number(p.price))}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 26, color: "#6b6e76" }}>
            {p ? `${p.category} · ${p.college_name}` : "Verified students only"}
          </div>
        </div>
      </div>
    ),
    size
  );
}
