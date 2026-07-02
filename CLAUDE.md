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
- [ ] Phase 6 — Board feed + filters + resolve
- [ ] Phase 6.5 — **Spaces: Girls' Closet** (user idea, designed 2026-07-02): members-only space per college for sharing/lending wearables. Security model: `spaces` + `space_members` tables, listings gain nullable `space_id`, RLS makes space-scoped rows unreachable to non-members (not UI hiding). Entry by member vouch/approval (bootstrap: founder designates a first member per college); **no gender field stored anywhere** — social verification like the WhatsApp groups it replaces. Lend/return mechanics arrive with Phase 32 rent/lend; v1 = space-scoped listings + join requests + member approval.
- [ ] Phases 7–14 — see Part 1 doc
- [ ] Phase 14.5 — Capacitor Android wrap (APK/AAB + Play Store)
- [ ] Phases 15–40 — see Part 2 doc

Update this tracker when a phase is committed.
