// Parse a datetime-local value ("YYYY-MM-DDTHH:MM") as IST wall-clock. Without
// the explicit offset, new Date() reads it in the server's tz (UTC on Vercel),
// shifting every user-entered time by +5:30.
export function istParse(local: string) {
  return new Date(local + "+05:30");
}

// IST Y-M-D for a real instant. Never toISOString() (UTC — lands on the wrong
// day between 00:00 and 05:30 IST) and never toDateString() (server tz).
export function istDateKey(d: Date) {
  // en-CA gives YYYY-MM-DD, so the key sorts and compares as a string.
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// "Today" / "Yesterday" / "5 Jul", decided in IST on any server timezone.
// FINDINGS F1: chat + notifications compared toDateString() (server tz = UTC on
// Vercel), so anything sent 00:00–05:30 IST was labelled the previous day.
export function istDayLabel(iso: string, now: Date = new Date()) {
  const key = istDateKey(new Date(iso));
  const todayKey = istDateKey(now);
  const yesterdayKey = istDateKey(new Date(now.getTime() - 86400000));
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}
