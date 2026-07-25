import { NextResponse } from "next/server";
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { titleFor } from "../title";

// Phase 21a fan-out: pg_net trigger (0025) POSTs { message, link, nid, subs }
// here; we web-push each subscription. No DB reads — the payload is complete
// and already tenancy-scoped by notify(). Dead endpoints (404/410) are pruned
// via the anon-granted prune RPC over PostgREST (no service key, no SDK).

type Sub = {
  endpoint: string;
  keys: { p256dh: string; auth: string } | null;
  kind?: "webpush" | "fcm";
};

const MAX_SUBS = 20;

// Phase 21b: FCM via firebase-admin, creds from env (never a JSON file in the
// repo). Returns null when the three FIREBASE_* vars aren't configured —
// fcm subs then count as failed rather than crashing web-push delivery.
function fcmMessaging() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // tolerate both paste styles: wrapping quotes kept from the JSON, and
    // literal \n sequences vs real newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
    if (projectId == null || clientEmail == null || privateKey == null) return null;
    const app =
      getApps()[0] ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getMessaging(app);
  } catch {
    // bad FCM config must never break web-push delivery for the same notification
    return null;
  }
}

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

  let body: { message?: unknown; link?: unknown; nid?: unknown; subs?: unknown; app?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { message, link, nid, subs, app } = body;
  if (typeof message !== "string" || typeof link !== "string" || !Array.isArray(subs)) {
    return NextResponse.json({ error: "bad shape" }, { status: 400 });
  }

  // Title = the routed app's name (0063 passes `app`); defaults to LockedIn.
  const title = titleFor(app);
  const payload = JSON.stringify({ title, body: message, link, nid });
  let sent = 0;
  let pruned = 0;
  let failed = 0;

  const messaging = fcmMessaging();

  await Promise.allSettled(
    (subs as Sub[]).slice(0, MAX_SUBS).map(async (s) => {
      if (typeof s?.endpoint !== "string") {
        failed += 1;
        return;
      }

      if (s.kind === "fcm") {
        if (messaging === null) {
          failed += 1;
          return;
        }
        try {
          await messaging.send({
            token: s.endpoint,
            notification: { title, body: message },
            data: { link, nid: String(nid ?? "") },
            android: { priority: "high" },
          });
          sent += 1;
        } catch (e) {
          const code = (e as { code?: string }).code ?? "";
          if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
            await prune(s.endpoint);
            pruned += 1;
          } else {
            failed += 1;
          }
        }
        return;
      }

      if (s.keys == null) {
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
