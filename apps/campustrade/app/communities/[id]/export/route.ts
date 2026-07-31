import { createClient } from "@suite/auth/server";

type Row = { name: string | null; email: string; status: string; since: string };

// Escape a CSV cell: neutralize spreadsheet formula injection (a member named
// "=HYPERLINK(...)" must not execute when the moderator opens this in Excel),
// then quote when it contains a comma/quote/newline, doubling inner quotes.
function cell(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /communities/[id]/export → CSV of members + interested (moderator only).
// club_roster_export() re-checks authorization server-side.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const [{ data: rows, error }, { data: club }] = await Promise.all([
    supabase.rpc("club_roster_export", { cid: id }),
    supabase.from("communities").select("name").eq("id", id).maybeSingle(),
  ]);
  if (error) return new Response("Not allowed", { status: 403 });

  const header = "Name,Email,Status,Joined/Interested since";
  const body = ((rows ?? []) as Row[]).map((r) =>
    [cell(r.name ?? ""), cell(r.email), cell(r.status), cell(new Date(r.since).toISOString().slice(0, 10))].join(",")
  );
  const csv = "﻿" + [header, ...body].join("\r\n"); // BOM so Excel reads UTF-8

  const slug = (club?.name ?? "club").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-roster.csv"`,
    },
  });
}
