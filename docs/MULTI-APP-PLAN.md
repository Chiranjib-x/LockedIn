# LockedIn → Four-App Suite Plan

One shared Supabase backend (proven: GateRunner already logs in with the same
student account and reads live pickup data). Four focused apps carved out of
the mother app, plus the mother itself during transition.

| # | App (working name) | Contents | Status |
|---|---|---|---|
| 1 | **GateRunner** | Gate pickups: post → claim → dropoff → confirm → UPI reward, "heading to the gate", escalation | **Phase 1 built** (repo `../GateRunner`, shared login verified) |
| 2 | **CampusTrade** (name TBD) | Marketplace (sell/rent/offers/requests), Girls' Closet/Boys' Den, Lost & Found board + claims, **plus daily life**: cabs, group-buys, pools, timetable+attendance, study groups, crews, matcher, deals, toolbox, chat | not started |
| 3 | **CampusClubs** (name TBD) | Chapters/clubs/teams/communities + full management: command center, applications, positions, meetings+roll-call+free-window, tasks, resources, inventory, boxes, dues/funds, polls, scheduled posts, events + barcode check-in, analytics, rosters | not started |
| 4 | **VIT Compass** (name TBD) | **New build**: interactive VIT campus map for freshers — tap a building → photos, info, what happens there. Public-read (works before you even have your college email) | not started |

The mother app (LockedIn) **stays live during the whole transition** — it is
the reference implementation and the fallback. Decide its long-term fate in
Phase 7 with real usage data, not now.

---

## The Launch Gate (the "commonly occurring problems" checklist)

Every app must pass ALL 14 before its store release. These encode the exact
bugs this project already hit (⚠ = we shipped this bug once) plus the standard
killers. This checklist IS the quality mechanism of the plan — every per-app
phase ends by running it.

1. **Auth edges** — signup (confirm on AND off), login, logout, expired
   session mid-action, deleted-account login attempt, OAuth code landing on
   `/` (⚠ middleware safety net), password reset.
2. **Refresh-after-mutation** (⚠) — every mutate button updates the mounted
   view with no manual reload (`useRefresh` pattern).
3. **Timezone, both directions** (⚠ twice) — render with
   `timeZone:"Asia/Kolkata"`; parse datetime-local with `istParse` (+05:30).
   Vercel is UTC; dev machines are IST — test on prod, not just dev.
4. **Empty / loading / error states** — every list has an intentional empty
   state; every async section a skeleton; every failed action a readable
   message. No silent failures, no blank screens.
5. **Mobile 390px** — no horizontal overflow, tap targets ≥44px, verified by
   screenshot; also one pass at 360px (⚠ moderator header overflow).
6. **RLS adversarial probe** — for each new/ported table: member-blocked
   writes, college isolation, definer-RPC guards. Run as SQL probes with real
   role JWTs (established pattern).
7. **Version skew** — old installed APKs keep working against the newer
   shared DB: additive migrations only, expand/contract for any removal
   (⚠ contact_pref outage — twice). The FOUR apps make this 4× more
   important: a breaking migration now bricks four apps at once.
8. **Deep links & routing** — app scheme (`com.<app>.campus://`) registered,
   OAuth return works in-app (⚠ Custom Tab flow), notification links open
   the right screen, unknown routes 404 gracefully.
9. **Push routing** — pushes reach the RIGHT app (see Phase 1): gate pushes
   → GateRunner if installed, else mother; club pushes → CampusClubs; etc.
   Opt-in prompts contextual, logout unsubscribes.
10. **Offline / flaky network** — app shell loads offline (SW cache), a
    failed fetch shows retry-able error not a white screen, no double-submit
    on slow networks (pending states on all submits).
11. **Performance budget** — landing + main list < 2.5s on throttled 4G,
    images compressed (⚠ client-side compression exists — reuse), no
    N+1 query storms on list pages (nested selects, head-count queries).
12. **Monitoring** — Sentry (or equivalent) wired for JS errors per app +
    a health check; you cannot fix what you cannot see once 4 apps are live.
13. **Store compliance** — privacy policy URL, in-app + web account deletion
    (⚠ built once — deletion in ANY app deletes the shared account: must be
    clearly worded!), data-safety form, versionCode discipline, signed AAB.
14. **Suite coherence** — one shared design system, "part of the LockedIn
    suite" cross-links, same username/profile everywhere, and the app does
    NOT show features it doesn't own (no dead links to other apps' content —
    either hide or hand off via deep link/store link).

---

## Phase 0 — Foundation: monorepo + shared packages
The single biggest risk of 4 apps is **shared-code drift** (GateRunner already
copy-pasted ui.tsx, upi-pay, auth — fine for one app, fatal for four).

- Create a **pnpm-workspaces monorepo** (`campus-suite/`):
  `apps/lockedin`, `apps/gaterunner`, `apps/trade`, `apps/clubs`, `apps/map`,
  `packages/ui` (tokens, Card/Button, logo system), `packages/auth`
  (supabase clients, requireUser, login/signup pages, college gate),
  `packages/lib` (useRefresh, istParse/istNow, upi-pay, image-upload, push).
- Move LockedIn in as `apps/lockedin` unchanged; absorb GateRunner.
- One `supabase/migrations` folder at the ROOT — the shared DB is suite-wide;
  no app owns migrations privately (version-skew rule 7 depends on this).
- Per-app `.env`, per-app Vercel project, per-app Capacitor config.
- Domains: `www.chiranjib.online` (mother) + `gate.` / `trade.` / `clubs.` /
  `map.chiranjib.online` subdomains (free on the existing domain).
- Decide + register the four real names/brands (each gets a logo variant from
  the flame-key system).
**Gate:** mother app builds & deploys unchanged from the monorepo before any
new app work starts.

## Phase 1 — Cross-app backend prep — COMPLETE (2026-07-16, 0063 applied; routing probed: gate→gaterunner only, marketplace→lockedin only, clubs→fallback both)
- **Push routing**: add `app` column to `push_subscriptions`; dispatch sends
  each notification type to the best-matching app's subscription, falling
  back to any (gate→gaterunner, community/event→clubs, marketplace/chat/
  everything-else→trade/mother). Without this, a user with 2 apps gets
  double pushes or none.
- **Notification links**: store type-scoped paths so each app can resolve its
  own (`/gate`, `/communities/x`, `/marketplace/y`).
- **Account deletion wording**: deleting in any app deletes the suite account
  (same auth.users row) — update copy in all delete flows + privacy pages.
- **Capacity check**: 4 apps share one Supabase free-tier project (MAU,
  realtime connections, egress). Estimate; plan the paid tier trigger point.
- **Rate limits / abuse**: per-college moderation already exists; confirm the
  report/block tables serve all apps (they do — shared DB).
**Gate:** push routing probed with two apps' subscriptions for one user.

## Phase 2 — GateRunner: finish + launch (the pilot) — CODE-COMPLETE (2026-07-19, fe6ee0a)
Status timeline + runner note (0064) + app-aware push (app='gaterunner') + green flame-key
brand + PWA manifest all built and verified (build green, E2E stepper). REMAINING (user-side):
Vercel project (Root Directory `apps/gaterunner`) + Cloudflare CNAME `gate.` → Capacitor wrap →
signed APK → run the 14-point Launch Gate on prod → Play internal track.

Original scope for reference:
- Status timeline + optional note (the chosen lightweight coordination).
- Push (claim / heading-to-gate / dropped-off) via the Phase-1 routing.
- Brand: name, icon (flame-key variant), splash, landing polish.
- Capacitor wrap → signed APK/AAB, `gate.chiranjib.online`, /download page.
- **Run the 14-point Launch Gate.** Ship to Play (internal → closed track).
This app is deliberately first: smallest surface, validates the whole
monorepo + push-routing + multi-APK pipeline before the big ones.

## Phase 3 — CampusClubs: the biggest port — CODE-COMPLETE (2026-07-19, apps/campusclubs, 68f4b1c)
Built by SUBTRACTION (forked mother → apps/campusclubs; communities depends on internal
timetable/board modules so a from-scratch @suite port was the wrong tool). Stripped to clubs-only
(nav Home·Clubs·[+]·Events·Profile, command-center home, clubs landing + /for-clubs, header
rebrand), app-aware push registers app='clubs' (DB-probed vs 0063), violet flame-key brand,
coherence pass (chat Message buttons removed — chat is Trade's; LockedIn→CampusClubs on reachable
pages; legal pages keep the suite name). Build green ×5, screenshots at 390px, no h-overflow.
REMAINING (user-side): Vercel project (Root Directory `apps/campusclubs`) + Cloudflare CNAME
`clubs.` → Capacitor wrap (fix appId/appName/deep-link + push title) → Launch Gate on prod → Play.

Original scope for reference:
- Port: communities suite (all Wave-F features incl. boxes), events + barcode
  check-in, leader command center, founder tools (approve/official/delete),
  /for-clubs onboarding page, club search.
- Include chat **scoped to community contexts** (announcement coordination),
  or defer chat here if the status quo (DMs live in trade app) is acceptable
  — decide during the phase with the real UX in hand.
- Strip everything else. Home = command center + my clubs + discover shelves.
- **Launch Gate**, ship.

## Phase 4 — CampusTrade (+ daily life): the biggest app — CODE-COMPLETE (2026-07-20, apps/campustrade, 7b9f41d)
Built by SUBTRACTION as recommended (forked mother → apps/campustrade). Stripped the gate +
clubs/communities/events surfaces (Gate Runner card + data, LeaderStrip/ClubsStrip/FreeWindow/
QuantaBanner, Events/Clubs FEATURE entries, gate pillar + clubs/events feature-map rows). Kept
marketplace/spaces/cabs/group-buys/pools/board/timetable/study-groups/crews/deals/toolbox/chat
(chat's primary home). Amber flame-key brand, metadata/manifest → CampusTrade, push registers
app='trade' (0063 fallback delivers marketplace/chat/board — DB-probed; dual-install `else→'trade'`
refinement deferred to Phase 6). Build green ×4, 390px screenshots trade-only, no h-overflow.
REMAINING (user-side): Vercel project (Root Directory `apps/campustrade`) + Cloudflare CNAME
`trade.` → Capacitor wrap (fix appId/appName/deep-link + push title) → Launch Gate on prod → Play.

Original scope for reference:
- Port: marketplace complete (listings/offers/rent/requests/spaces), board
  L&F + claims + smart matching, chat (DMs + group rooms — chat's primary
  home), cabs, group-buys, pools, timetable+attendance, study groups, crews,
  matcher, deals, toolbox, saves+alerts, karma/ratings, global search scoped
  to its own content.
- This is "LockedIn minus gate minus clubs" — closest to the mother; consider
  building it BY subtraction (fork mother inside the monorepo, delete gate +
  clubs, rebrand) rather than by addition. Decide at phase start.
- **Launch Gate**, ship.

## Phase 5 — VIT Compass: the new build (freshers' map) — CORE COMPLETE (2026-07-20, apps/vitcompass, dec6f6e)
Built: `campus_buildings` schema + public-read RLS + moderator definer RPCs (0065, 38d1701);
VIT Vellore seeded with 24 buildings (7 exact GPS from user, 17 estimated — CMS-refinable);
standalone public app apps/vitcompass (MapLibre + OSM raster, no auth/@suite deps) with
category-colored markers, filter chips, tap-to-open building sheet, and Google-Maps "How to
reach" directions (5d partial). Teal flame-key brand. Verified: prod build green, 390px E2E
(full-height canvas, 24 markers, sheet with correct info).
REMAINING: (5a) moderator CMS screen to add/edit buildings + fix the 17 estimated coords —
lives in the mother app (has auth+moderator) or add light auth to vitcompass, TBD; (5d) freshers'
checklist + events-overlay-from-shared-DB; deploy: Vercel Root `apps/vitcompass` + Cloudflare
CNAME `map.` → Capacitor wrap → Launch Gate (offline matters extra here).

Original scope for reference:
- **5a Data**: `campus_buildings` table (college_id — the map is per-college
  from day one; name, aka, category academic/hostel/mess/sports/admin/
  landmark, description, photos[], lat/lng or svg_id, floor info, timings).
  Founder/moderator CMS screen to add + edit buildings. Seed VIT Vellore's
  main buildings (user supplies/verifies the list — same directory pattern
  as the clubs seed: I draft, you correct).
- **5b Map tech decision**: custom illustrated/SVG campus map (charming,
  offline-friendly, zero API cost, hand-made tap regions) vs MapLibre/Leaflet
  + OpenStreetMap tiles (real geo, GPS blue-dot "where am I", more setup).
  Recommendation: **MapLibre + OSM** for the base (VIT's campus is mapped in
  OSM) with tap targets from building lat/lngs; add GPS locate. Decide 5b
  before building 5c.
- **5c App**: full-screen map, category filter chips, building sheet (photos,
  info, "how to reach"), search, fresher onboarding carousel ("your first
  week at VIT"), optional login (public read — freshers may not have their
  college email yet; RLS: buildings are public-read, writes founder-only).
- **5d Extras that make it amazing**: walking directions between buildings,
  "freshers' checklist" (hostel → mess → SJT…), events overlay from the
  shared DB (today's events pinned on the map via their venue), share a pin.
- **Launch Gate** (offline matters extra here — freshers with no campus wifi
  yet), ship before the next admission season.

## Phase 6 — Suite hardening sweep
Run the Launch Gate AGAIN on all four + mother after everything is live
(regressions creep during parallel work), plus:
- Cross-app: one account's deletion verified from each app; push routing
  re-probed; deep links between apps (clubs event → map building pin).
- Load: one shared-DB load review (indexes on the hottest per-app queries).
- Monitoring dashboards reviewed weekly; crash-free ≥ 99%.

## Phase 7 — Launch ops + mother's fate
- 4 Play listings (screenshots, feature graphics from the shared brand kit),
  staged rollouts, /download pages per subdomain.
- Cross-promo: each app's settings has "More from LockedIn" installers.
- Watch 4–8 weeks of usage; then decide: mother stays as the super-app for
  power users, becomes a launcher/portal, or sunsets (expand/contract rules
  make sunset safe whenever chosen).

---

## Decisions — LOCKED (user approved recommendations, 2026-07-16)
1. Names: **GateRunner · CampusTrade · CampusClubs · VIT Compass** (rename
   any of them anytime before their store listings).
2. Monorepo: **yes** — done in Phase 0. Deviation from the draft: **npm
   workspaces** instead of pnpm (toolchain already npm; Vercel-native; one
   less tool). packages/{ui,lib,auth} exist; gaterunner consumes them;
   lockedin migrates to them opportunistically (its internal imports were
   left untouched to keep Phase 0 zero-risk for prod).
3. Map tech: **MapLibre + OpenStreetMap**.
4. Chat: **CampusTrade only**.

## Phase 0 — COMPLETE (2026-07-16)
Monorepo live in the existing repo: apps/lockedin (mother, unchanged),
apps/gaterunner (consumes @suite/ui + @suite/lib + @suite/auth), packages/*,
suite-wide supabase/ + docs/ at root. Both apps build green from the
workspace. ⚠ OPERATIONAL: Vercel project root directory must be set to
`apps/lockedin` (Settings → Build & Deployment → Root Directory) — until
then pushes won't produce new mother deployments (prod keeps serving the
last good build). The original ../GateRunner repo is superseded — archive it.

## Order & why
0 → 1 → 2 (pilot proves pipeline) → 3 → 4 → 5 → 6 → 7.
Clubs before Trade because clubs is churn-heavy and its users (leads) are
your evangelists; Map before admission season regardless of 3/4 timing —
it can be pulled earlier since it's independent of the ports.
