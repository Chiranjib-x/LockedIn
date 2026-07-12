"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

// Three-state theme: system (default) -> dark -> light -> system.
// The no-flash script in layout.tsx applies the class before paint;
// this just mutates it live and persists the choice.
export default function ThemeToggle() {
  const [mode, setMode] = useState<"system" | "dark" | "light">("system");

  useEffect(() => {
    const stored = localStorage.getItem("li-theme");
    if (stored === "dark" || stored === "light") setMode(stored);
  }, []);

  function apply(next: "system" | "dark" | "light") {
    setMode(next);
    if (next === "system") localStorage.removeItem("li-theme");
    else localStorage.setItem("li-theme", next);
    const dark =
      next === "dark" ||
      (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  const next = mode === "system" ? "dark" : mode === "dark" ? "light" : "system";
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
