export type Prefs = {
  sleep_schedule: "early" | "normal" | "late";
  cleanliness: number;
  study_style: "quiet" | "group";
  noise_tolerance: number;
  food_pref: string;
  smoking: boolean;
  looking_for: "roommate" | "study_buddy" | "both";
};

// Weighted compatibility: high-impact axes (sleep, cleanliness, study style)
// carry most weight per the plan. Returns 0–100 plus "why you match" phrases.
export function scoreMatch(me: Prefs, other: Prefs): { score: number; why: string[] } {
  const why: string[] = [];
  let total = 0;

  // sleep (25): exact full, adjacent half
  const sleepOrder = { early: 0, normal: 1, late: 2 } as const;
  const sleepDiff = Math.abs(sleepOrder[me.sleep_schedule] - sleepOrder[other.sleep_schedule]);
  const sleepPts = sleepDiff === 0 ? 25 : sleepDiff === 1 ? 12 : 0;
  total += sleepPts;
  if (sleepDiff === 0) why.push(me.sleep_schedule === "late" ? "both night owls" : me.sleep_schedule === "early" ? "both early risers" : "same sleep schedule");

  // cleanliness (20)
  const cleanPts = 20 * (1 - Math.abs(me.cleanliness - other.cleanliness) / 4);
  total += cleanPts;
  if (Math.abs(me.cleanliness - other.cleanliness) <= 1 && me.cleanliness >= 4) why.push("both keep it tidy");

  // study style (20)
  if (me.study_style === other.study_style) {
    total += 20;
    why.push(me.study_style === "quiet" ? "both study in silence" : "both like group study");
  }

  // noise tolerance (10)
  total += 10 * (1 - Math.abs(me.noise_tolerance - other.noise_tolerance) / 4);

  // food (10)
  if (me.food_pref === "any" || other.food_pref === "any" || me.food_pref === other.food_pref) {
    total += 10;
    if (me.food_pref !== "any" && me.food_pref === other.food_pref) why.push(`both ${me.food_pref}`);
  }

  // smoking (15) — a hard-feeling axis; mismatch costs everything here
  if (me.smoking === other.smoking) {
    total += 15;
    if (!me.smoking) why.push("both non-smokers");
  }

  return { score: Math.round(total), why: why.slice(0, 3) };
}

// looking_for gate: both/equal overlap
export function lookingForCompatible(mine: Prefs["looking_for"], theirs: Prefs["looking_for"]) {
  return mine === "both" || theirs === "both" || mine === theirs;
}
