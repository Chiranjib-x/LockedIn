"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Check, X, Undo2 } from "lucide-react";
import { setBuildingCoords } from "./actions";

export type Category = "academic" | "hostel" | "mess" | "sports" | "admin" | "landmark";

export type EditorBuilding = {
  id: string;
  name: string;
  category: Category;
  lat: number | null;
  lng: number | null;
  coords_verified: boolean;
};

// VIT Vellore campus centre (Technology Tower) — the fallback view when nothing
// is placed yet. Same constant the public map uses.
const CENTER: [number, number] = [79.1592, 12.9711];

// Verified pins are settled; unverified ones are the seeded estimates that still
// need a human to drag them. Colour is the whole signal here, so it comes from
// design tokens rather than hex literals (markers are imperative DOM, but a CSS
// var resolves fine inside an inline style).
const VERIFIED = "var(--color-tint-green-fg)";
const ESTIMATE = "var(--color-tint-amber-fg)";

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg: string };

export default function CampusMapEditor({ buildings: initial }: { buildings: EditorBuilding[] }) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [buildings, setBuildings] = useState<EditorBuilding[]>(initial);
  const [armed, setArmed] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", msg: "" });

  // Local state owns the pins so a drag can update optimistically, but the server
  // list changes underneath us when a building is added or deleted elsewhere on
  // this page (BuildingRow's delete calls router.refresh(), which re-renders this
  // component with new props while the state below stays stale — a deleted
  // building's marker used to linger on the map). Re-sync when the SET of ids
  // changes, not on every prop change: a drag also refreshes the route, and
  // resetting then would fight the person dragging. Adjust-during-render rather
  // than an effect — remounting via key would tear the map down and lose the view.
  const ids = initial.map((b) => b.id).join(",");
  const [seenIds, setSeenIds] = useState(ids);
  if (ids !== seenIds) {
    setSeenIds(ids);
    setBuildings(initial);
  }

  // The map click handler is registered once, so it must not close over stale
  // state — it reads the armed building through a ref instead. Synced in an
  // effect, never during render (refs are not render-time values).
  const armedRef = useRef<string | null>(null);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  const placed = buildings.filter((b) => b.lat != null && b.lng != null);
  const unplaced = buildings.filter((b) => b.lat == null || b.lng == null);
  const remaining = buildings.filter((b) => !b.coords_verified).length;

  // Persist a pin. Returns false if the write failed so the caller can put the
  // marker back where it was — a marker sitting at coordinates the DB rejected
  // is a lie the admin would not notice.
  const save = useCallback(async (id: string, lat: number, lng: number) => {
    setStatus({ kind: "saving", msg: "Saving…" });
    const res = await setBuildingCoords(id, lat, lng);
    if (res?.error) {
      setStatus({ kind: "error", msg: res.error });
      return false;
    }
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, lat, lng, coords_verified: true } : b))
    );
    setStatus({ kind: "ok", msg: "Saved" });
    return true;
  }, []);

  // Init the map exactly once.
  useEffect(() => {
    if (mapRef.current || !mapDiv.current) return;
    const map = new maplibregl.Map({
      container: mapDiv.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: CENTER,
      zoom: 15.3,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Click-to-place: only fires while a building is armed from the strip below.
    map.on("click", (e) => {
      const id = armedRef.current;
      if (!id) return;
      setArmed(null);
      void save(id, e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      map.resize(); // the container can settle its size after init
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [save]);

  // Rebuild markers whenever the set of placed buildings changes. 24 markers is
  // small enough that a full rebuild beats diffing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const b of buildings) {
      if (b.lat == null || b.lng == null) continue;
      const colour = b.coords_verified ? VERIFIED : ESTIMATE;

      const el = document.createElement("div");
      el.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:6px",
        "padding:8px 12px",
        "border-radius:999px",
        `border:2px solid ${colour}`,
        "background:var(--color-card, #fff)",
        "color:var(--color-foreground, #111)",
        "font:600 12px/1 system-ui, sans-serif",
        "white-space:nowrap",
        "cursor:grab",
        "box-shadow:0 2px 8px rgb(0 0 0 / 0.18)",
      ].join(";");
      const dot = document.createElement("span");
      dot.style.cssText = `width:8px;height:8px;border-radius:999px;background:${colour};flex:none`;
      el.appendChild(dot);
      el.appendChild(document.createTextNode(b.name));
      el.title = b.coords_verified ? `${b.name} — placed` : `${b.name} — estimated, drag me`;

      const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "center" })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        void save(b.id, lat, lng).then((ok) => {
          // Put it back if the write was rejected.
          if (!ok && b.lat != null && b.lng != null) marker.setLngLat([b.lng, b.lat]);
        });
      });

      markersRef.current.push(marker);
    }
  }, [buildings, ready, save]);

  // Frame everything that's placed, once the map is up.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || placed.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    placed.forEach((b) => bounds.extend([b.lng as number, b.lat as number]));
    map.fitBounds(bounds, { padding: 70, maxZoom: 17, duration: 0 });
    // Run only on first ready — refitting after every drag would yank the view
    // out from under the person dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const focus = (b: EditorBuilding) => {
    const map = mapRef.current;
    if (!map || b.lat == null || b.lng == null) return;
    map.flyTo({ center: [b.lng, b.lat], zoom: 17.5, speed: 1.2 });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Drag a pin onto the real building. It saves the moment you let go.
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            remaining === 0
              ? "bg-tint-green text-tint-green-fg"
              : "bg-tint-amber text-tint-amber-fg"
          }`}
        >
          {remaining === 0 ? "All pins confirmed" : `${remaining} still to check`}
        </span>
      </div>

      {armed && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          <span>
            Tap the map to place{" "}
            <span className="font-semibold">{buildings.find((b) => b.id === armed)?.name}</span>
          </span>
          <button
            type="button"
            onClick={() => setArmed(null)}
            className="press flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} /> Cancel
          </button>
        </div>
      )}

      {status.kind !== "idle" && (
        <p
          role="status"
          className={`rounded-xl px-3 py-2 text-sm ${
            status.kind === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {status.kind === "ok" ? "✓ " : ""}
          {status.msg}
        </p>
      )}

      {/* Explicit h-full w-full on the canvas host: maplibre sets its own inline
          position:relative, which cancels an `absolute inset-0` child. */}
      <div className="relative h-[65vh] min-h-[380px] w-full overflow-hidden rounded-2xl border border-border">
        <div ref={mapDiv} className="h-full w-full" />
      </div>

      {unplaced.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3">
          <p className="text-sm font-semibold">Not on the map yet ({unplaced.length})</p>
          <p className="text-xs text-muted-foreground">
            Pick one, then tap where it belongs.
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setArmed(armed === b.id ? null : b.id)}
                className={`press flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                  armed === b.id
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border hover:border-primary"
                }`}
              >
                <MapPin className="h-4 w-4" strokeWidth={2.2} /> {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {placed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
          <p className="text-sm font-semibold">Jump to a building</p>
          <div className="flex flex-wrap gap-2">
            {placed.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => focus(b)}
                className="press flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:border-primary"
              >
                {b.coords_verified ? (
                  <Check className="h-4 w-4 text-tint-green-fg" strokeWidth={2.6} />
                ) : (
                  <Undo2 className="h-4 w-4 text-tint-amber-fg" strokeWidth={2.2} />
                )}
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
