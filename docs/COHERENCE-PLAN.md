# Coherence & Completeness Plan

Catch and fix inconsistencies + missing basics across LockedIn, one phase at a
time. Two systemic bugs get fixed globally first (they cause many symptoms at
once), then every app section gets swept against one fixed rubric.

Status legend: ☐ todo · ◐ in progress · ☑ done (commit)

---

## The per-section rubric (applied in Phases 3+)

Every section is checked against these 8 points. A section isn't "done" until
all pass or a gap is explicitly logged.

1. **Live update** — after any create/edit/delete/toggle, the view updates with
   NO manual reload. (Depends on Phase 0.)
2. **Full CRUD** — the user can create, see, edit, AND delete their own content.
   No dead ends (e.g. can post but can't delete).
3. **Taxonomy/labels** — chapter/club/team/community used correctly; no stale
   "Clubs"-only language. (Depends on Phase 1.)
4. **Empty state** — every list/section with no data shows an intentional empty
   state, not a blank or a broken card.
5. **Loading state** — async sections show a skeleton/spinner, never a flash of
   nothing.
6. **Error state** — failed actions surface a readable message; no silent fails.
7. **Mobile 390px** — no horizontal overflow, no cut-off text, tap targets ≥44px.
8. **Navigation** — back links present and correct; deep links resolve; the
   bottom-nav/home entry points reach it.

---

## Phase 0 — Auto-refresh after mutations (SYSTEMIC) ☑ (communities suite)

**Symptom:** changes don't show without a manual reload/navigation.
**Cause:** client components do `onClick={() => serverAction()}`; the action's
`revalidatePath()` invalidates the server cache but nothing re-renders the
mounted tree — that refetch only rides a navigation/transition.
**Fix:** one shared helper (`useAction`/`useRefreshAction`) that does
`startTransition(async () => { await fn(); router.refresh(); })`, then retrofit
every bare-onClick mutate button to use it. ~40 client components in `modules/`.
**Scope:** Phase 0 fixes the **communities management suite** (ops, meetings,
money, polls, achievements, questions, positions, client) — the highest-churn
surface + where the repro lives. Every OTHER module's refresh fix is folded
into its section sweep (Phases 6–12) since those files get edited there anyway.
`lib/use-refresh.ts` is the shared hook used by all of them.
**Done when:** the Phase-0 repro (task "mark done" reflects with no reload)
passes, spot-checked across the communities suite.

## Phase 1 — Taxonomy & labels (GLOBAL) ☑

Make chapter/team/community first-class everywhere "Clubs" is hardcoded.
- `app/search/page.tsx` — split/relabel the "Clubs" tab + result section so it
  reads "Clubs & Teams" (or shows the type per result), since it already returns
  all community types.
- Sweep the other 18 files with "club" language (home card already says
  "Clubs & Teams"; check for-clubs, analytics, quanta-banner, share-link,
  bottom nav, etc.) and align copy with the 4-type model.
**Done when:** no user-facing surface implies communities are only "clubs".

## Phase 2 — Navigation & entry-points (GLOBAL) ☐

- Bottom nav labels/targets coherent with current features.
- Every detail page has a correct back link.
- Home feature cards all point somewhere real (post-Vibeyard redesign check).
- No orphan routes (reachable pages with no link in).

---

## Phase 3+ — Section sweeps (rubric above), in priority order

3. **Communities** (chapters/clubs/teams) ☐ — most recent churn: profile edit,
   achievements, applications, meetings, tasks, dues, polls, deletion, founder
   management. Highest surface area.
4. **Search / Explore** ☐ — the named example; verify all tabs return + label
   correctly, empty states, people-by-username hint.
5. **Home feed** ☐ — post-redesign: all cards, strips, skeletons, ordering.
6. **Marketplace + Requests** ☐ — listings, offers, rent/lend, requests, delete.
7. **Board + Events** ☐ — lost/found/notice, events, RSVP, feedback, check-in.
8. **Chat** ☐ — DMs, group rooms, realtime, blocks, unread.
9. **Timetable + attendance** ☐ — IST correctness, bunk math, marking.
10. **Gate / Cabs / Group-buy / Pools** ☐ — transaction flows, UPI, ratings.
11. **Crews + Spaces** ☐ — private groups, members, notes.
12. **Profile / Settings / Auth** ☐ — edit profile, delete account, blocks,
    Google sign-in, notifications.

---

## How each phase runs

1. Reproduce the issue(s) in that area (Playwright @390×844 or DB probe).
2. Fix against the 8-point rubric.
3. tsc + build + targeted E2E; screenshot mobile.
4. One commit per phase; update this doc's checkbox with the commit hash.
5. Deploy after each phase (or batch — user's call).

## Findings log (fill as we go)
- 2026-07-16: search tab "Clubs" mislabels chapters/teams/communities (Phase 1/4).
- 2026-07-16: ~42/49 client mutate buttons don't refresh the view (Phase 0).
