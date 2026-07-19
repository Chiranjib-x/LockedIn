// VIT registration numbers encode batch + branch: e.g. 24BCE2411 ->
// 24 = 2024 batch, BCE = branch, 2411 = sequence. The year and the 3-letter
// code are extracted verbatim (always correct); only the human-readable branch
// name is a lookup, so unknown codes fall back to the raw code (never a guess).
//
// ponytail: seed with the codes we're sure of; extend BRANCH as the user
// confirms more. Fallback keeps output correct for any missing code.
const BRANCH: Record<string, string> = {
  BCE: "CSE",
  BME: "Mechanical",
  BEC: "ECE",
  BEE: "EEE",
  BCL: "Civil",
  BBT: "Biotech",
  BCH: "Chemical",
};

export type Reg = { batch: number; branch: string; code: string };

export function parseReg(value: string): Reg | null {
  const code = value.trim().toUpperCase();
  const m = /^(\d{2})([A-Z]{3})\d+$/.exec(code);
  if (!m) return null;
  return { batch: 2000 + Number(m[1]), branch: BRANCH[m[2]] ?? m[2], code };
}

// One-line label for a roster row: "2024 · CSE" (or "" if not a reg number).
export function regLabel(value: string): string {
  const r = parseReg(value);
  return r ? `${r.batch} · ${r.branch}` : "";
}
