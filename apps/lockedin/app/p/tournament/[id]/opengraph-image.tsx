import { ImageResponse } from "next/og";
import { createClient } from "@suite/auth/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Campus tournament";

// The card WhatsApp renders when the link is pasted. Without this the page fell
// back to the app-wide LockedIn card, so a Valorant tournament looked like a
// generic campus-app advert in a gaming group — the one audience that reads a
// mismatched card as "not for me".
//
// Themed BY GAME, not hardcoded to Valorant: `game` is free text, so the next
// tournament picks up its own palette if it has one and a neutral brand palette
// if it does not. Adding a game is one entry here.
//
// OG images render outside the CSS pipeline, so every value is inlined.
const THEMES: Record<string, { bg: string; panel: string; accent: string; text: string; dim: string }> = {
  valorant: { bg: "#0F1923", panel: "#1A242D", accent: "#FF4655", text: "#ECE8E1", dim: "#8B978F" },
  bgmi:     { bg: "#12100B", panel: "#1E1A12", accent: "#F2A900", text: "#F6F1E7", dim: "#9A8F79" },
  chess:    { bg: "#161512", panel: "#262421", accent: "#B58863", text: "#F0EDE6", dim: "#9A948A" },
  fifa:     { bg: "#04121F", panel: "#0B2135", accent: "#00E0B8", text: "#EAF6FF", dim: "#7F9BAC" },
  default:  { bg: "#1D0E37", panel: "#2A1250", accent: "#8B7CF6", text: "#F6F5F1", dim: "#A99CC7" },
};

function themeFor(game: string) {
  return THEMES[game.trim().toLowerCase()] ?? THEMES.default;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let t: {
    game: string;
    title: string;
    tagline: string | null;
    team_size: number;
    starts_at: string | null;
    prize: string | null;
    logo_url: string | null;
    player_count: number;
    college_name: string;
  } | null = null;
  try {
    const supabase = await createClient();
    ({ data: t } = await supabase.rpc("public_tournament_preview", { tid: id }).maybeSingle());
  } catch {
    // fall through to the brand-only card
  }

  const c = themeFor(t?.game ?? "");
  const players = Number(t?.player_count ?? 0);
  const when = t?.starts_at
    ? new Date(t.starts_at).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      })
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: c.bg,
          color: c.text,
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        {/* A hard accent rule down the left edge — reads as a game poster at
            thumbnail size, where body text is illegible anyway. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            background: c.accent,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {t?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo_url} alt="" width={64} height={64} style={{ objectFit: "contain" }} />
            )}
            <div
              style={{
                display: "flex",
                background: c.accent,
                color: c.bg,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 3,
                padding: "8px 18px",
              }}
            >
              {(t?.game ?? "CAMPUS").toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: c.dim, letterSpacing: 1 }}>
              {t?.college_name ?? "Your campus"}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 86, fontWeight: 800, lineHeight: 1.05 }}>
            {t
              ? t.title.length > 42
                ? t.title.slice(0, 39) + "…"
                : t.title
              : "Campus tournament"}
          </div>

          {t?.tagline && (
            <div style={{ display: "flex", fontSize: 32, color: c.dim, lineHeight: 1.3 }}>
              {t.tagline.length > 84 ? t.tagline.slice(0, 81) + "…" : t.tagline}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {[
            t ? (t.team_size > 1 ? `${t.team_size}v${t.team_size}` : "SOLO") : null,
            when,
            t?.prize ?? null,
            // Only once it is a number worth showing — an empty bracket should
            // not advertise itself as empty.
            players > 0 ? `${players} entered` : null,
          ]
            .filter(Boolean)
            .slice(0, 4)
            .map((chip, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  background: c.panel,
                  border: `2px solid ${c.accent}`,
                  color: c.text,
                  fontSize: 25,
                  fontWeight: 700,
                  padding: "10px 18px",
                  // A long prize wrapped these onto two lines and the row lost
                  // its shape. One line each, truncated.
                  whiteSpace: "nowrap",
                }}
              >
                {String(chip).length > 26 ? String(chip).slice(0, 25) + "…" : String(chip)}
              </div>
            ))}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: 25,
              fontWeight: 700,
              color: c.dim,
              letterSpacing: 1,
            }}
          >
            lockedincampus.online
          </div>
        </div>
      </div>
    ),
    size
  );
}
