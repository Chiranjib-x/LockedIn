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
- [x] Phase 6.5 — **Spaces: Girls' Closet** (migration 0004): members-only spaces, vouch-based entry, no gender stored, space listings RLS-unreachable to non-members. Member removal (beyond self-leave) deferred to Phase 17 moderation; lend/return mechanics land with Phase 32. **2026-07-05: Boys' Den 🎮 seeded per college on the same infra** (no new code; symmetric isolation verified both ways). Production: founder designates each space's founding member (see 0004 seed pattern).
- [x] Phase 7+8 — Group-Buy: orders + join + UPI collection (built together; reusable UPI helper)
- [x] Phase 9 — Subscription pooling
- [x] Phase 9.5 — **Gate Runner** (user idea, designed 2026-07-02): food/parcel deliveries stop at the main gate; students already walking there collect others' parcels for a small reward. `pickup_requests` (college_id TENANCY, requester_id, runner_id, platform, item_desc, gate, expected_at, reward, status open→claimed→delivered/cancelled). Runner claims an open request; **requester confirms receipt with one tap** (no OTP codes — requester-side confirmation is the honest party's button); reward settles via the Phase 8 UPI helper on confirmation. Later: Phase 15 transaction on delivery → ratings; Phase 16 karma for runners; Phase 18 chat (context=pickup); Phase 21 push on claim/arrival.
- [x] Phase 10+11 — Matcher: prefs questionnaire + weighted scoring + connect (mutual reveals contact) — run migration 0008
- [x] Phase 12 — Notifications: DB-trigger emission (0010), bell + unread badge, auto-mark-read page
- [x] Phase 13 — Polish: route skeletons, error/404 pages, global focus-visible, theme-color
- [x] Phase 14 — Deploy setup: Vercel linked, env vars set, preview verified; production launch pending user's go-live checklist (see DEPLOY.md)

- [ ] Phase 14.5 — Capacitor Android wrap (APK/AAB + Play Store). **Use `components/SplashLoader` (recolored uiverse metaball, on-brand cobalt) as the app-launch splash.**

### User ideas (designed 2026-07-04, expanded 2026-07-05) — Wave A trust + all 5 items below DONE (2026-07-03); Deals stays unpaid until traffic justifies charging; next up is Wave B (Capacitor/PWA/push) or Phase 27 global search
1. [x] **Communities** (0017, built 2026-07-05) — one system for official clubs AND interest groups (F1, football, Valorant, Tekken…): anyone proposes → **founder approves** (`is_approved`); `communities` (college_id TENANCY, name, emoji/logo, category enum club/sports/gaming/hobby/other, description, is_approved) + `community_members` (role member/moderator — proposer becomes first moderator; founder can appoint more); moderators post updates/events via `posts.community_id` (nullable FK) riding the board rails + future share cards (22) + feed (26). Group chat for members lands with Phase 34's multi-party conversations (context=community). Replaces scattered WhatsApp interest groups.
2. [x] **Deals + Toolbox** (built 2026-07-02, migration 0018) — one founder-curated admin rail (`/admin/showcase`, 🧰 in header) for two surfaces: (a) **Deals** — `merchants` (college_id TENANCY, name, category, logo_url, offer_text, details, link_or_contact, is_active) + `/deals`; no `merchant_stats`/sponsored-slot tracking yet, that's Phase 40 once traffic justifies monetizing. (b) **Toolbox** — `showcase_items` (college_id TENANCY, name, url, tagline, category, logo_url, is_active) + `/toolbox` cards. Both RLS: college-scoped read (active-only for students, all for founder), writes gated to `is_app_moderator()`. Home hub cards added.
3. [x] **Cab pooling** (built 2026-07-02, migration 0019) — `trips` (college_id TENANCY, creator_id, origin, destination, depart_at, seats, notes, fare_total, upi_id, status open/full/cancelled/completed) + `trip_members` (capacity-enforced join, paid_marked/paid_confirmed). Fare splits evenly live (fare_total ÷ members+1, not persisted, so it self-corrects as people join/leave) via the existing UpiPay helper. `/cabs` browse with destination+date filters, `/cabs/new`, `/cabs/[id]` detail with join/leave, pay/confirm, message-creator (chat context "trip"). A trigger auto-flips status open↔full as seats fill/free. **Bug caught + fixed during build:** the capacity-check RLS policy's subquery against `trip_members` from within `trip_members`'s own INSERT policy caused "infinite recursion detected in policy" — fixed with a `security definer` `trip_seats_taken()` helper (same pattern as `is_community_moderator()` elsewhere), verified via direct RLS probing + full two-account Playwright flow (post → browse/filter → join → auto-full → pay → confirm → leave → auto-reopen).
4. [x] **Timetable + attendance** (built 2026-07-03, migration 0020, Phases 24–25 pulled forward) — the daily-open anchor. `timetable_entries` (user_id, college_id TENANCY, day_of_week, starts_at/ends_at, course_code, title, venue, min_attendance override) + `attendance_records` (course_code, date, status present/absent/cancelled, unique per user+course+date) — both **owner-only RLS** (private data, not college-browsed, but still college_id-tagged per the tenancy rule). Skipped Phase 24's per-college `slot_config`/FFCS seed grid entirely — freeform start/end time inputs cover any college's timetable without seed-data busywork; also skipped Phase 23's shared `courses` FK table, `course_code` is plain text (crowd-sourced course tagging for marketplace is an unrelated goal for later). `/timetable`: Today section with one-tap Present/Absent/Cancelled, attendance summary widget (worst-first), week list, add/delete class. `/timetable/[code]`: percentage bar, plain-English bunk math ("can miss N more" / "attend next N to recover"), past-date marking, history. Home hub gets the pre-designed **Up Next card** (`docs/design/directions.png`): next class, time-until pill, live attendance %. `colleges.attendance_threshold` (default 75) with per-course override. Bunk math is a pure function module (`modules/timetable/bunk-math.ts`), edge cases (exact threshold, below threshold, zero classes) hand-verified before wiring into UI. Verified end-to-end via Playwright: add class → mark present → course detail renders correct bunk message → Up Next card on home → empty states clean.
5. [x] **Personalized home feed** (built 2026-07-03, no migration — reads existing tables, Phase 26 pulled forward) — `/home`'s static module grid replaced by six independent feed sections, each its own async server component in `modules/feed/` wrapped in its own `<Suspense>` (streams + skeleton via `SkeletonSection`) and its own try/catch around the data fetch (JSX built outside the try block, so it can't itself throw — required for the "one section erroring can't blank the page" goal): **Now** (next class + any-course-below-threshold warning, reuses the Up Next card), **Unread chats** (top 3, shared query extracted to `modules/chat/recent.ts` so `/chats` and the feed can't drift), **Renewals due soon** (subscriptions within 7 days), **Fresh on campus** (newest listings weighted toward the categories the user has posted in — the only "existing data, no new tracking infra" signal available), **Happening today** (notices posted today + events today), **Group-buys closing soon** (open orders within 48h). The module chip row (now actually wrapped in `Link`s — it rendered inert `span`s before this) is the "compact nav row" the phase brief calls for, so removing the big grid didn't cost direct access to anything. Scope cuts vs. the phase brief, both commented in the relevant files: no "possible match" lost-and-found alerts (no similarity heuristic exists) and no recruitment-drive deadlines (no such module exists in this app). `Date.now()`/`new Date()` calls needed pulling into named top-level helper functions outside the component bodies — the React Compiler lint rule (`react-hooks/purity`) only flags impure calls written directly in a component's body, not inside a plain function it calls, matching the pre-existing `timeLeft()` pattern in `app/group-buy/page.tsx`. Verified live: seeded one real item per section (cross-account listing, chat message, group-buy, notice) and confirmed each rendered correctly, then confirmed the page returns to a clean, error-free empty-ish state after cleanup.

- [x] Phase 15 — Transactions + ratings (0011): sold-to-buyer flow, mutual rate-nudge via trigger, stars on profiles/listings, RLS-guarded (party-only, one-per-txn)
- [x] Phase 16 — Karma & badges (0012): append-only karma_events + sync trigger, awards (+10 txn/+5 good rating/+15 found-resolved/+3 group-buy), tiers New/Active/Trusted/Campus Legend, tier-up notify, badges on profile/listing/match
- [x] Phase 15.5 — Blind ratings (0013): ratee can't read own feedback rows, only aggregate (anti-grudge)
- [x] Phase 17 — Report/block/moderation (0014): is_moderator + is_banned flags, soft-delete, report sheet + block filter, banned banner, /admin/moderation console. Founder (test acct) flagged moderator.
- [x] Phase 18 — Chat core (0015): Realtime 1:1 conversations, find-or-create DM RPC (block/ban enforced), /chats list + thread (optimistic send, openers, share-contact), Chat-with-seller replaces contact reveal, Chats tab live
- [x] Phase 19 — Chat everywhere (0016): mutual-match auto-chat + icebreaker, Message organizer/owner, realtime unread nav badge, new-message notifications (collapsed per-conversation). **🚢 Wave A "The Trust Update" COMPLETE.**
- [ ] Phases 20–40 — see Part 2 doc → then user's clubs/deals/cabs

Update this tracker when a phase is committed.
