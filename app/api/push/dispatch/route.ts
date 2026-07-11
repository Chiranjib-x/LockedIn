import { NextResponse } from "next/server";
import webpush from "web-push";

// Phase 21a fan-out: pg_net trigger (0025) POSTs { message, link, nid, subs }
// here; we web-push each subscription. No DB reads — the payload is complete
// and already tenancy-scoped by notify(). Dead endpoints (404/410) are pruned
// via the anon-granted prune RPC over PostgREST (no service key, no SDK).

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } | null };

const MAX_SUBS = 20;

async function prune(endpoint: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/prune_push_subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: JSON.stringify({ p_endpoint: endpoint }),
    });
  } catch {
    // pruning is best-effort; the row gets another chance next dispatch
  }
}

export async function POST(req: Request) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub == null || priv == null) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 503 });
  }
  webpush.setVapidDetails("mailto:dashchiranjib2004@gmail.com", pub, priv);

  let body: { message?: unknown; link?: unknown; nid?: unknown; subs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { message, link, nid, subs } = body;
  if (typeof message !== "string" || typeof link !== "string" || !Array.isArray(subs)) {
    return NextResponse.json({ error: "bad shape" }, { status: 400 });
  }

  const payload = JSON.stringify({ title: "LockedIn", body: message, link, nid });
  let sent = 0;
  let pruned = 0;
  let failed = 0;

  await Promise.allSettled(
    (subs as Sub[]).slice(0, MAX_SUBS).map(async (s) => {
      if (typeof s?.endpoint !== "string" || s.keys == null) {
        failed += 1;
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          payload
        );
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prune(s.endpoint);
          pruned += 1;
        } else {
          failed += 1;
        }
      }
    })
  );

  return NextResponse.json({ sent, pruned, failed });
}
