# LockedIn — Campus Super-App

Multi-college campus app: Marketplace, Lost & Found + Notices, Group-Buy, Subscription Pooling, Roommate/Study-Buddy Matcher — plus the growth waves in `docs/`.

**Stack:** Next.js (App Router, TypeScript) · Tailwind v4 · Supabase (Postgres + Auth + Storage + RLS + Realtime) via `@supabase/ssr` · Vercel.

## Build plans (read the relevant phase before building)

- `docs/campus-superapp-build-plan.md` — Part 1, Phases 0–14 (core + 5 MVP modules). Written single-college; **build it multi-tenant** per the tenancy rule below.
- `docs/campus-superapp-growth-build-plan.md` — Part 2, Phases 15–40 (trust, habit, money).

**Working rhythm:** one phase per session, read existing code first, build only that phase, end with a manual test checklist, `git commit` after it passes.

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

Tokens live in `app/globals.css` `@theme` — **never hardcode hex in components**. Palette: "Marketplace P2P" trust purple (`primary #7c3aed`) + transaction green (`accent #16a34a`), WCAG-adjusted. Fonts: Outfit (headings) / Work Sans (body) via `next/font`. Use `Card`/`Button`/`Section`/`inputClass` from `components/ui.tsx`. Touch targets ≥44px (`min-h-11`), ≥8px gaps between tappables, mobile-first breakpoints. For new UI decisions (charts, new page patterns), query the local skill: `python ~/.claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|typography|ux|chart>`.

## Conventions

- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server). Migrations as SQL files in `supabase/migrations/` — numbered, never edited after commit.
- Feature modules live in `app/` routes + `modules/<name>/` for module-specific components/logic; shared components in `components/`.
- Mobile-first; students are on phones.

## Phase tracker

- [x] Phase 0 — Scaffold & tooling
- [x] Phase 1 — Campus-email auth + profiles (+ `colleges` table, domain→college mapping)
- [x] Phase 2 — App shell + home hub
- [ ] Phases 3–14 — see Part 1 doc
- [ ] Phase 14.5 — Capacitor Android wrap (APK/AAB + Play Store)
- [ ] Phases 15–40 — see Part 2 doc

Update this tracker when a phase is committed.
