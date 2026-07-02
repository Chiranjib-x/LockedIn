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

## Conventions

- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server). Migrations as SQL files in `supabase/migrations/` — numbered, never edited after commit.
- Feature modules live in `app/` routes + `modules/<name>/` for module-specific components/logic; shared components in `components/`.
- Mobile-first; students are on phones.

## Phase tracker

- [x] Phase 0 — Scaffold & tooling
- [ ] Phase 1 — Campus-email auth + profiles (+ `colleges` table, domain→college mapping)
- [ ] Phase 2 — App shell + home hub
- [ ] Phases 3–14 — see Part 1 doc
- [ ] Phases 15–40 — see Part 2 doc

Update this tracker when a phase is committed.
