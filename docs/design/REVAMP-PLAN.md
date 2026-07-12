# UI Revamp Plan — full walkthrough → "purely amazing"

**How to use this doc:** every section has a `YOUR DIRECTION:` slot. Reply in chat like
"Marketplace: neon duotone icons + glow-pulse on price" — one line per section is enough.
Anything you don't specify uses my `Default:` recommendation. Nothing gets built until you say go.

---

## 0. Global vocabularies (pick once, applied everywhere)

### Icon/logo language — per module you can override
| Option | Look | Cost |
|---|---|---|
| **A. Lucide stroke** (current) | clean outline, professional | free, done |
| **B. Duotone tiles** | stroke icon + filled tint shape behind (mockup style) | low |
| **C. Neon glyphs** | stroke icon with glow + gradient stroke (System style, dark-mode showcase) | low-med |
| **D. Custom drawn glyphs** | bespoke SVG per module (real "logos") | high, per-module |
| **E. Animated icons** | icon animates on tap (bell rings, cart bounces) — CSS only | med |

Default: **B in light mode, C in dark mode** — same lucide set, styled per theme.

### Effect vocabulary — reference these names in your directions
- `glow` — luminous shadow (exists: `.glow-primary`)
- `gradient-border` — animated cobalt→violet border sweep on featured cards
- `scanline` — faint moving HUD line across a card (System window vibe, dark only)
- `count-up` — numbers animate to value (karma, prices, match %)
- `rank-ring` — circular progress ring around avatars/percentages
- `confetti` — burst on success moments (deal closed, group-buy complete)
- `spring-pop` — scale-in with overshoot (exists: `.animate-scale-in`)
- `shimmer` — loading skeletons (exists)
- `press-glow` — tap feedback glows instead of just scaling
- `parallax-mesh` — background blooms drift with scroll
- `type-in` — headline letters cascade in on page load

YOUR DIRECTION (global): ___

---

## PHASE 1 — First impressions & identity (login, signup, profile)
*The blandest screens today are the first ones people see.*

**Login / Signup — current:** plain h1 + two inputs floating in a void. Zero brand.
**Proposed:** full-bleed dark "System" hero — mesh + glow wordmark, glass card holding the form,
`type-in` on the headline, "Your campus. One app." tagline. Signup keeps the trust line.
YOUR DIRECTION: ___

**Profile — current:** a settings form with karma bolted on top.
**Proposed:** "Hunter License" card at top — glass ID card with avatar, name, batch/hostel, karma
`rank-ring` + tier name, rating stars; `count-up` on karma. Form collapses below it. This is the
Solo Leveling moment of the app.
YOUR DIRECTION: ___

## PHASE 2 — The daily surfaces (home, marketplace, board, chats)

**Home — current:** strong after refresh (search + tinted tiles + feed).
**Proposed:** tile icons get per-theme treatment (B/C above); `press-glow` on tiles; feed section
headers get tiny icons; "Up next" class card gets `gradient-border` when class is <15 min away.
YOUR DIRECTION: ___

**Marketplace browse — current:** clean grid; chips fine.
**Proposed:** price as a pill chip overlaid on photo corner; sold/lent overlays get backdrop-blur;
rent badge gets tint; `spring-pop` stagger already exists.
YOUR DIRECTION: ___

**Marketplace detail — current:** functional; gallery is a plain img.
**Proposed:** edge-to-edge gallery with dot indicators, sticky bottom CTA bar (Message seller /
Make offer) in glass, seller row with `rank-ring` avatar, price `count-up`.
YOUR DIRECTION: ___

**Board — current:** good hierarchy after MapPin pass.
**Proposed:** type badges get per-type tint + icon (Lost=rose/search, Found=green/check,
Notice=blue/megaphone, Event=violet/calendar); claim-verification panel styled as a System
"quest dialog" in dark.
YOUR DIRECTION: ___

**Chats — current:** empty state is a void; thread is plain bubbles.
**Proposed:** bubbles get subtle gradient for own messages; group chats show sender color-coded
names; empty state gets an illustration + CTA into marketplace.
YOUR DIRECTION: ___

## PHASE 3 — The transactional flows (group-buy, pools, rent, offers)

**Group-buy detail — current:** timeline bar is small and flat.
**Proposed:** timeline becomes the hero — glowing progress segments, current step pulses;
"arrived" banner gets `scanline`; fee-split box shows per-person avatars; completion fires
`confetti`.
YOUR DIRECTION: ___

**Subscription pools — current:** plain cards, renewal chip.
**Proposed:** service logo-letter avatar (N for Netflix in brand-ish tint), renewal urgency as a
colored ring countdown, browse-pools cards show seat dots (●●○○).
YOUR DIRECTION: ___

**Offers / rent flows — current:** functional panels.
**Proposed:** offer ladder shown as a mini negotiation timeline; accepted state gets `confetti`;
rental due dates get countdown chips.
YOUR DIRECTION: ___

## PHASE 4 — The utility modules (cabs, gate, matches, study, timetable, communities, toolbox, deals)

**Cabs — current:** origin → destination text rows.
**Proposed:** route rendered as pill-to-pill with animated dashed line; date chips; seat dots.
YOUR DIRECTION: ___

**Gate — current:** decent cards + status chips.
**Proposed:** status chips get motion (Waiting = pulsing dot); reward ₹ stands out in accent;
"I'm heading to the gate" becomes a prominent glowing action.
YOUR DIRECTION: ___

**Matches — current:** 100% number is the only visual.
**Proposed:** match % becomes a `rank-ring` with `count-up`; shared traits render as tint chips;
"New" badge glows.
YOUR DIRECTION: ___

**Study groups — current:** cards with capacity text.
**Proposed:** course code as a monospace tint chip; capacity as seat dots; member avatars stack.
YOUR DIRECTION: ___

**Timetable — current:** empty-state heavy; add-class dashed button.
**Proposed:** today rail as horizontal time blocks with a "now" indicator line; attendance % as
mini rings per course.
YOUR DIRECTION: ___

**Communities / Toolbox / Deals — current:** simple lists.
**Proposed:** category tint chips, logo-letter avatars, consistent card anatomy with Phase 2.
YOUR DIRECTION: ___

## PHASE 5 — Motion, empty states, and system-wide delight

- **Empty states**: one illustrated style across all 12 modules (currently: mixed emoji sizes).
  Options: big tinted lucide icon / custom SVG illustrations / keep emoji. Default: tinted icon
  in a soft blob + one-line wit (keep the current copy voice).
- **Page transitions**: `animate-fade-up` exists; add staggered children on all list pages.
- **Success moments**: unified `confetti`/`glow-pulse` for: sale completed, group-buy done,
  claim accepted, match connected, rating submitted.
- **Pull-to-refresh / scroll physics**: PWA-side polish, dark mesh `parallax-mesh`.
- **Notifications page**: group by day, icon per notification type, unread = glow dot.
- **Play Store assets**: final reshoot after all phases.
YOUR DIRECTION: ___

---

## Known issues folded in (fix during their phase)
- Purple QA image on Casio listing (needs your in-app delete, or approve the DB update).
- Moderator header at ≤380px — resolved by avatar chip, verify at 360 in Phase 1.
- Chat-thread walk screenshot failed (selector) — audit thread UI live during Phase 2.

## Execution notes
- Everything token-driven via `globals.css` — new tokens proposed per phase before use.
- Zero functional changes; server components untouched except className edits.
- Each phase: build → tsc → Playwright light+dark shots → your review → next phase.
