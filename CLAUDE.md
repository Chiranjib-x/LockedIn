# LockedIn — Campus Super-App

Multi-college campus app: Marketplace, Lost & Found + Notices, Group-Buy, Subscription Pooling, Roommate/Study-Buddy Matcher — plus the growth waves in `docs/`.

**Stack:** Next.js (App Router, TypeScript) · Tailwind v4 · Supabase (Postgres + Auth + Storage + RLS + Realtime) via `@supabase/ssr` · Vercel.

## Build plans (read the relevant phase before building)

- `docs/campus-superapp-build-plan.md` — Part 1, Phases 0–14 (core + 5 MVP modules). Written single-college; **build it multi-tenant** per the tenancy rule below.
- `docs/campus-superapp-growth-build-plan.md` — Part 2, Phases 15–40 (trust, habit, money).

**Working rhythm:** one phase per session, read existing code first, build only that phase, end with a manual test checklist, `git commit` after it passes.

**Verification:** after building a phase, drive it with Python Playwright (installed; see `~/.claude/skills/webapp-testing/SKILL.md`) against the dev server at a **390×844 mobile viewport** — click the new flows, screenshot, and look at the screenshots. Dev login: `lockedin.phase1.test@gmail.com` / `testpass1234` (Demo College).

## THE TENANCY RULE (applies to every table, no exceptions)

The app serves multiple colleges from one deployment. Every content table must have:

1. A `college_id` column (FK to `colleges`).
2. RLS scoping reads/writes to the user's college via a `get_my_college_id()` SQL helper (derives the college from the user's profile).
3. `college_id` stamped **server-side** on insert — never trusted from the client.

Users belong to a college via their email domain: the `colleges` table maps `email_domain -> college` and signup resolves it there. Owner-only tables (e.g. per-user settings) still carry `college_id` for scoping where content is browsed.

## Android-first (decided)

Ship Android via a **Capacitor wrapper** around this same Next.js app — no separate codebase. Implications:

- After Phase 14 (deploy), add **Phase 14.5: Capacitor Android wrap** — APK/AAB pointing at the deployed site, app icon/splash, Play Store listing.
- Phase 20 (PWA) still happens — it serves web users and the wrapper reuses the manifest/icons.
- Phase 21 (push): inside the Android app use **native FCM via @capacitor/push-notifications**, web push only as the browser fallback. Keep the push-send helper transport-agnostic (one `push_subscriptions` table with a `kind` column: webpush | fcm).
- Keep everything mobile-web compatible: no desktop-only interactions, camera/QR features must work in a webview.

## Design system (decided — via ui-ux-pro-max)

**Source of truth: the user's Claude Design "Campus" project, exported to `docs/design/`** (`Campus.dc.html` = onboarding, `Campus - Directions.dc.html` + `directions.png` = home-feed structure and the three visual directions; the adopted system is 1a's trust-blue on 1b's warm cream). Check `directions.png` before building any home-feed section — Up Next class card (Phase 24–25), Due soon (Phase 26), search bar (Phase 27), karma badge on avatar (Phase 16) are all pre-designed there.

Tokens live in `app/globals.css` `@theme` — **never hardcode hex in components**. Palette: warm cream paper (`#f6f5f1`) + near-black ink (`#0b0b0d`) + saturated cobalt (`oklch(0.48 0.19 264)`, hover `-strong`) + transaction green (`accent #16a34a`) for money/success. Fonts: Bricolage Grotesque (display) / Hanken Grotesk (body) via `next/font`. Shapes: pill buttons (`rounded-full`), chunky cards (`rounded-2xl`), squircle chips. Bottom tab bar (`components/bottom-nav.tsx`) is the primary authed nav — light up its dead tabs as phases land. Use `Card`/`Button`/`Section`/`inputClass` from `components/ui.tsx`. Touch targets ≥44px (`min-h-11`), ≥8px gaps, mobile-first. For net-new UI decisions, query: `python ~/.claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|typography|ux|chart>`.

**Gap-filler authority:** for decisions the Campus system doesn't specify (WCAG contrast, 4-point spacing, focus/hover state contracts), `~/.claude/skills/typeui-fundamentals/` decides — but the design system always wins for concrete token values. Lean on its `accessibility.md` for the Phase 13 / Phase 29 a11y passes.

**Aesthetic details (committed):** global grain overlay (`body::after`) + ambient gradient-mesh (`body::before`, drifts) so glass has something to refract. **Glassmorphism is IN** (user override of the bencium default) via the `.glass` utility — reserve for floating layers (header, bottom nav, sheets, hero cards), never flat lists/every card, since glass only reads over the mesh or scrolling content. **Motion is a product quality**: primitives in globals.css — `.animate-fade-up` / `.animate-scale-in` / `.animate-sheet-up`, `.press` for tap feedback, `.shimmer` for skeletons, easings `--ease-out-quint` / `--ease-spring`. All CSS-only (no motion lib yet — add `motion`/Framer only if a gesture/spring/shared-element interaction genuinely needs it). Everything guarded by a global `prefers-reduced-motion` reset. Typography rules from the `typography` skill ENFORCED: real curly apostrophes (’), em dashes, one-exclamation budget; emoji OK in informal UI (chips/cards), not in formal copy.

## Conventions

- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server). Migrations as SQL files in `supabase/migrations/` — numbered, never edited after commit.
- Feature modules live in `app/` routes + `modules/<name>/` for module-specific components/logic; shared components in `components/`.
- Mobile-first; students are on phones.

## Phase tracker

- [x] Phase 0 — Scaffold & tooling
- [x] Phase 1 — Campus-email auth + profiles (+ `colleges` table, domain→college mapping)
- [x] Phase 2 — App shell + home hub
- [x] Phase 3 — Marketplace: listings schema + reusable image upload + create/manage
- [x] Phase 4 — Marketplace: browse grid, URL-synced search/filter/sort, detail, contact reveal
- [x] Phase 5 — Lost & Found + Notices: schema + create post (run migration 0003)
- [x] Phase 6 — Board feed + filters + resolve
- [x] Phase 6.5 — **Spaces: Girls' Closet** (migration 0004): members-only spaces, vouch-based entry, no gender stored, space listings RLS-unreachable to non-members. Member removal (beyond self-leave) deferred to Phase 17 moderation; lend/return mechanics land with Phase 32.
- [x] Phase 7+8 — Group-Buy: orders + join + UPI collection (built together; reusable UPI helper)
- [x] Phase 9 — Subscription pooling
- [x] Phase 9.5 — **Gate Runner** (user idea, designed 2026-07-02): food/parcel deliveries stop at the main gate; students already walking there collect others' parcels for a small reward. `pickup_requests` (college_id TENANCY, requester_id, runner_id, platform, item_desc, gate, expected_at, reward, status open→claimed→delivered/cancelled). Runner claims an open request; **requester confirms receipt with one tap** (no OTP codes — requester-side confirmation is the honest party's button); reward settles via the Phase 8 UPI helper on confirmation. Later: Phase 15 transaction on delivery → ratings; Phase 16 karma for runners; Phase 18 chat (context=pickup); Phase 21 push on claim/arrival.
- [x] Phase 10+11 — Matcher: prefs questionnaire + weighted scoring + connect (mutual reveals contact) — run migration 0008
- [x] Phase 12 — Notifications: DB-trigger emission (0010), bell + unread badge, auto-mark-read page
- [x] Phase 13 — Polish: route skeletons, error/404 pages, global focus-visible, theme-color
- [x] Phase 14 — Deploy setup: Vercel linked, env vars set, preview verified; production launch pending user's go-live checklist (see DEPLOY.md)

- [ ] Phase 14.5 — Capacitor Android wrap (APK/AAB + Play Store)

### User ideas (designed 2026-07-04) — DECIDED: Wave A trust (15–19) builds FIRST, then these; Deals stays unpaid until traffic justifies charging
1. [ ] **Clubs & Teams** — student proposes club → founder approves (adds `is_moderator` to profiles — thin Phase 17 slice — flag the founder's account); approved club gets page (name/logo/category/description) + `club_members` with role member/admin; admins post updates/events via `posts.club_id` (nullable FK) so club events ride the board rails, share cards (22), and the feed (26). TENANCY RULE on `clubs`.
2. [ ] **Deals (local shops)** — Phase 40 pulled forward as FREE content: `merchants` + `/deals` (category filters) + `/admin/merchants` CRUD (is_moderator). Build in `merchant_stats` (impressions/clicks) + a clearly-labeled sponsored feed slot, but keep it unpaid until traffic justifies charging.
3. [ ] **Cab pooling** — `trips` (college_id, creator_id, origin, destination, depart_at, seats, notes, status) + `trip_members` (capacity-enforced join); browse by destination/date; fare split via existing UPI helper; chat context lands with Phase 18. Demand spikes: airport/station at breaks.
4. [ ] **Timetable + attendance** (Phases 24–25 pulled forward) — the daily-open anchor: slot grid per college, one-tap present/absent/cancelled, 75% threshold + bunk math.
5. [ ] **Personalized home feed** (Phase 26 pulled forward) — surfaces next class, attendance warnings, closing group-buys, club events, deals, cab pools. The daily surface everything above feeds.

- [x] Phase 15 — Transactions + ratings (0011): sold-to-buyer flow, mutual rate-nudge via trigger, stars on profiles/listings, RLS-guarded (party-only, one-per-txn)
- [ ] Phases 16–40 — see Part 2 doc (Wave A trust: 16 karma → 17 moderation → 18–19 chat)

Update this tracker when a phase is committed.
