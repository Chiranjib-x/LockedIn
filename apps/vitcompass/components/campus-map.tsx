"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, X } from "lucide-react";

export type Category = "academic" | "hostel" | "mess" | "sports" | "admin" | "landmark";
export type Building = {
  id: string;
  name: string;
  aka: string | null;
  category: Category;
  description: string | null;
  lat: number;
  lng: number;
  near_landmark: string | null;
};

// One place for the per-category identity: colour (marker + chip), emoji, label.
const CAT: Record<Category, { color: string; emoji: string; label: string }> = {
  academic: { color: "#2251c7", emoji: "🎓", label: "Academic" },
  hostel: { color: "#d97706", emoji: "🛏️", label: "Hostels" },
  mess: { color: "#16a34a", emoji: "🍽️", label: "Food & mess" },
  sports: { color: "#dc2626", emoji: "⚽", label: "Sports" },
  admin: { color: "#7c3aed", emoji: "🏛️", label: "Admin" },
  landmark: { color: "#db2777", emoji: "📍", label: "Landmarks" },
};
const ORDER: Category[] = ["academic", "hostel", "mess", "sports", "admin", "landmark"];

// VIT Vellore campus centre (Technology Tower), for the initial view.
const CENTER: [number, number] = [79.1592, 12.9711];

export default function CampusMap({ buildings }: { buildings: Building[] }) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Building | null>(null);

  // Only categories that actually have buildings get a chip.
  const presentCats = useMemo(
    () => ORDER.filter((c) => buildings.some((b) => b.category === c)),
    [buildings]
  );

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
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
    map.on("load", () => {
      map.resize(); // in case the container settled its size after init
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // (Re)build markers whenever the filter or data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const b of buildings) {
      if (filter && b.category !== filter) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", b.name);
      el.style.cssText = `width:18px;height:18px;border-radius:9999px;border:2px solid #fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.35);background:${CAT[b.category].color}`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(b);
        map.flyTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 16.5), speed: 0.8 });
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([b.lng, b.lat]).addTo(map);
      markersRef.current.push(marker);
    }
  }, [filter, buildings, ready]);

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* explicit h/w — maplibre sets inline position:relative on its container,
          which would cancel `absolute inset-0` and collapse the height to 0. */}
      <div ref={mapDiv} className="h-full w-full" />

      {/* Top overlay: title + category filter chips */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto glass flex items-center gap-2 self-start rounded-2xl px-3 py-2">
          <MapPin className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <div className="leading-tight">
            <p className="font-heading text-sm font-bold">VIT Compass</p>
            <p className="text-[11px] text-muted-foreground">Tap a building to see what&rsquo;s inside</p>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === null} onClick={() => setFilter(null)} label="All" />
          {presentCats.map((c) => (
            <Chip
              key={c}
              active={filter === c}
              onClick={() => setFilter((f) => (f === c ? null : c))}
              label={`${CAT[c].emoji} ${CAT[c].label}`}
              color={CAT[c].color}
            />
          ))}
        </div>
      </div>

      {selected && <BuildingSheet b={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function Chip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`press shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap backdrop-blur transition-colors ${
        active ? "border-transparent bg-primary text-on-primary" : "border-border bg-card/80 text-foreground"
      }`}
      style={active && color ? { background: color } : undefined}
    >
      {label}
    </button>
  );
}

function BuildingSheet({ b, onClose }: { b: Building; onClose: () => void }) {
  const meta = CAT[b.category];
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`;
  return (
    <div className="animate-fade-up absolute inset-x-0 bottom-0 z-20 p-3">
      <div className="glass mx-auto flex max-w-md flex-col gap-3 rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{ background: `${meta.color}22` }}
          >
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg leading-tight font-bold">{b.name}</h2>
            <p className="text-xs text-muted-foreground">
              {b.aka ? `${b.aka} · ` : ""}
              {meta.label}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="press -m-1 p-1 text-muted-foreground">
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        {b.description && <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>}
        {b.near_landmark && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} /> {b.near_landmark}
          </p>
        )}

        <a
          href={gmaps}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          <Navigation className="h-4 w-4" strokeWidth={2.2} /> How to reach
        </a>
      </div>
    </div>
  );
}
