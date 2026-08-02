// The mark shown beside a tournament.
//
// A game's logo belongs to its publisher, so none is shipped here. If the
// organiser puts a URL in `logo_url` that image is used; otherwise this draws a
// geometric mark in the game's colours, which keeps a Valorant page from looking
// like a generic campus card without borrowing anyone's trademark.
//
// Adding a game is one entry in each map. Anything unlisted gets the brand mark,
// so a new tournament never renders blank.

export const GAME_COLORS: Record<string, { bg: string; accent: string }> = {
  valorant: { bg: "#0F1923", accent: "#FF4655" },
  bgmi: { bg: "#12100B", accent: "#F2A900" },
  chess: { bg: "#161512", accent: "#B58863" },
  fifa: { bg: "#04121F", accent: "#00E0B8" },
};

export function gameColors(game: string) {
  return GAME_COLORS[game.trim().toLowerCase()] ?? { bg: "#2A1250", accent: "#8B7CF6" };
}

function Glyph({ game, accent }: { game: string; accent: string }) {
  const g = game.trim().toLowerCase();

  // Two angled strokes meeting low — the tactical-shooter shape, drawn from
  // scratch rather than reproduced from the game's own artwork.
  if (g === "valorant") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <path d="M14 18 L38 18 L62 74 L62 86 L50 86 Z" fill={accent} />
        <path d="M86 18 L86 52 L74 66 L62 40 L62 18 Z" fill={accent} />
      </svg>
    );
  }
  if (g === "chess") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <path d="M30 22 h40 v12 l-10 10 v22 l12 16 v6 H28 v-6 l12-16 V44 l-10-10 Z" fill={accent} />
      </svg>
    );
  }
  // Default: a bracket, which is what every tournament actually is.
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path
        d="M22 24 h16 v22 h18 M22 76 h16 V54 h18 M56 50 h22"
        stroke={accent}
        strokeWidth="9"
        fill="none"
        strokeLinecap="square"
      />
    </svg>
  );
}

export default function GameMark({
  game,
  logoUrl,
  size = 56,
  rounded = 16,
}: {
  game: string;
  logoUrl?: string | null;
  size?: number;
  rounded?: number;
}) {
  const { bg, accent } = gameColors(game);

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${game} logo`}
        style={{ width: size, height: size, borderRadius: rounded }}
        className="shrink-0 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: rounded, background: bg }}
      className="flex shrink-0 items-center justify-center"
    >
      <span style={{ width: size * 0.6, height: size * 0.6 }} className="flex">
        <Glyph game={game} accent={accent} />
      </span>
    </span>
  );
}
