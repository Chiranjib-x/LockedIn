"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

// Three-state theme, LIGHT BY DEFAULT: light -> dark -> system -> light.
//
// 'system' now has to be STORED, because an absent key means light. It used to
// be the absence of the key, which made following the OS the default — and put
// every dark-phone student into dark mode without asking.
// The no-flash script in layout.tsx applies the class before paint;
// this just mutates it live and persists the choice.
//
// The stored choice is browser state, so it is read through
// useSyncExternalStore rather than an effect: the server snapshot is "system"
// (matching the pre-paint script's default), which avoids both a hydration
// mismatch and a synchronous setState inside an effect.
type Mode = "system" | "dark" | "light";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
function getSnapshot(): Mode {
  const stored = localStorage.getItem("li-theme");
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "light";
}
const getServerSnapshot = (): Mode => "light";

export default function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function apply(next: Mode) {
    localStorage.setItem("li-theme", next);
    const dark =
      next === "dark" ||
      (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    listeners.forEach((l) => l()); // re-read the snapshot so the icon updates
  }

  const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const Icon = mode === "system" ? SunMoon : mode === "dark" ? Moon : Sun;

  return (
    <button
      onClick={() => apply(next)}
      aria-label={`Theme: ${mode} — switch`}
      className="press flex min-h-11 min-w-11 items-center justify-center text-foreground/70 hover:text-foreground"
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
