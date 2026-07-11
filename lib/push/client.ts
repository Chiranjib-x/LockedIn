"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Web-push subscribe/unsubscribe glue. Only works where the SW is registered
// (production builds — components/pwa.tsx skips dev), so callers treat
// "unsupported" as a silent no-op, never an error.

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensurePushSubscription(
  supabase: SupabaseClient
): Promise<"subscribed" | "denied" | "unsupported" | "failed"> {
  if (!pushSupported()) return "unsupported";
  try {
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") return "denied";

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ),
      }));

    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: sub.endpoint,
      p_keys: sub.toJSON().keys ?? null,
    });
    return error ? "failed" : "subscribed";
  } catch {
    return "failed";
  }
}

export async function disablePush(supabase: SupabaseClient) {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub !== null) {
      await supabase.rpc("prune_push_subscription", { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch {
    // logout proceeds regardless — a stale row dies at first 410 prune
  }
}
