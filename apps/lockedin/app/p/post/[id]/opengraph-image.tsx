import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LockedIn board post";

const TYPE_LABEL: Record<string, string> = {
  lost: "Lost",
  found: "Found",
  notice: "Notice",
  event: "Event",
};

// Token values inlined — OG images render outside the CSS pipeline.
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: { title: string; type: string; college_name: string; image: string | null } | null = null;
  try {
    const supabase = await createClient();
    ({ data: p } = await supabase.rpc("public_post_preview", { pid: id }).maybeSingle());
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
          {p && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 26,
                fontWeight: 700,
                color: "#2251C7",
                background: "#2251C71f",
                borderRadius: 999,
                padding: "6px 22px",
              }}
            >
              {TYPE_LABEL[p.type] ?? p.type}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>
            {p ? (p.title.length > 60 ? p.title.slice(0, 57) + "…" : p.title) : "Your campus, one app."}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#6b6e76" }}>
            {p ? `Campus board · ${p.college_name}` : "Verified students only"}
          </div>
        </div>
      </div>
    ),
    size
  );
}
