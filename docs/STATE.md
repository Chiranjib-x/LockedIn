# STATE

## Goal
Build Phase 20 (PWA installability): manifest, icons, service worker, install prompt, iOS meta.

## Now
Phase 22 (share cards + public previews) built and committed; Phase 20 committed earlier. BLOCKED on user: apply migration 0021 (harness requires attended approval for live-DB writes), then verify preview data rendering, then redeploy prod (Phases 20+22 both undeployed).

## Next
1. User back: apply 0021 (rerun scratchpad/apply_0021.js with approval, or SQL editor)
2. Verify /p/listing/<id> + /p/post/<id> render data + OG cards with real content
3. Redeploy prod on user's word (covers Phase 20 PWA + Phase 22)
4. Then: Phase 21 push (Firebase project from user) or 14.5 Capacitor (Android Studio)


## Constraints
- Keep the gmail.com seed college until user finishes testing (delete only at real launch).
- User asked: production launch steps only with explicit go-ahead ("deploy" given 2026-07-09 — done).

## Decisions
- DECISION: hand-rolled service worker, no next-pwa — next-pwa predates app router and is unmaintained; ~60 lines covers app-shell cache + offline fallback; no new dependency.
- DECISION: app/manifest.ts (Next-native MetadataRoute.Manifest) over public/manifest.json — auto-linked, typed.
- DECISION: SW caches only static assets + offline page, never user data — avoids logout-purge complexity; revisit at Phase 21 push.
- DECISION: brand cobalt for icons = #2251C7, derived from token oklch(0.48 0.19 264) in app/globals.css.

## Facts
- Dev server: http://localhost:3001 (task bwafmsrj8) — PORT 3000 IS ANOTHER APP (user's IWAI portal, do not kill). Identity-check curl by <title>, not status code.
- Prod: https://lockedin-swart-ten.vercel.app (Vercel project chiranjibs-projects-c31c03e0/lockedin).
- Type check: npx tsc --noEmit. Build: npm run build. E2E: python + playwright sync API, 390x844 viewport.
- Test accounts (password testpass1234): lockedin.phase1.test@gmail.com (founder/moderator), lockedin.test.girl@gmail.com (Girls' Closet), lockedin.test.boy@gmail.com (Boys' Den) — all Demo College.
- Icon tooling: Pillow 12.3.0 and sharp both available.

## Done
- Prod deploy + QA sweep (2026-07-09) — RESULT: all 12 module pages OK, login OK, domain-reject OK on lockedin-swart-ten.vercel.app.
- Test boy/girl accounts in respective spaces — RESULT: symmetric isolation verified via UI both ways.
- Phase 20 PWA (2026-07-09) — RESULT: npm run build clean; Playwright on prod build: sw-registered/offline-fallback/install-card/dismiss-sticky all True. NOT yet redeployed to prod.

## Open items
- APPLY MIGRATION 0021 (public preview RPCs) — command ready: `node --env-file=.env.local <scratchpad>/apply_0021.js` needs attended run; or paste supabase/migrations/0021_public_previews.sql in SQL editor.
- Prod redeploy pending (Phases 20 + 22 committed but not deployed; user must say deploy).
- Delete gmail.com seed college + test accounts at real launch (DEPLOY.md item 3).
- Re-point Girls' Closet/Boys' Den founding members to real hostel reps at launch (DEPLOY.md item 4).
- Manual phone QA: photo upload, two-account realtime chat, UPI QR (can't automate).
- Phase 21: thin-push pattern, token delete on login/logout, cache purge on auth change.
- AddMember profile-enumeration hole → sealed vouching (roadmap step 7).

## Failed attempts
(none this task)
