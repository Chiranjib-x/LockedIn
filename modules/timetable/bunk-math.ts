// Pure attendance math, no I/O — cancelled classes are excluded from `held`
// before these run (that filtering happens where records are queried).

export function attendancePercent(attended: number, held: number): number {
  return held === 0 ? 100 : (attended / held) * 100;
}

// Max classes you can miss in a row and stay >= threshold%.
export function canMissMore(attended: number, held: number, thresholdPct: number): number {
  const t = thresholdPct / 100;
  return Math.max(0, Math.floor(attended / t - held));
}

// Min consecutive presents needed to climb back to threshold%.
export function mustAttendNext(attended: number, held: number, thresholdPct: number): number {
  const t = thresholdPct / 100;
  return Math.max(0, Math.ceil((t * held - attended) / (1 - t)));
}

export function bunkMessage(attended: number, held: number, thresholdPct: number): string {
  if (held === 0) return "No classes recorded yet.";
  const pct = attendancePercent(attended, held);
  if (pct >= thresholdPct) {
    const n = canMissMore(attended, held, thresholdPct);
    return n > 0
      ? `You can miss ${n} more class${n === 1 ? "" : "es"} and stay above ${thresholdPct}%.`
      : `Right at the edge — one more miss drops you below ${thresholdPct}%.`;
  }
  const n = mustAttendNext(attended, held, thresholdPct);
  return `Attend the next ${n} class${n === 1 ? "" : "es"} to get back to ${thresholdPct}%.`;
}
