# STATE

## Goal
Build Phase 20 (PWA installability): manifest, icons, service worker, install prompt, iOS meta.

## Now
Phase 20 complete and committed. Next session: Phase 14.5 (Capacitor) — needs Android Studio + Play account from user — or Phase 21 (push) — needs Firebase project from user.

## Next
1. Icons (public/icons/, 192/512 + maskable) + app/manifest.ts — check: files exist, manifest served
2. public/sw.js + public/offline.html + SW registration — check: Playwright SW registered, offline shows fallback
3. Install-prompt card on /home (2nd session, dismiss-forever) — check: Playwright synthetic beforeinstallprompt
4. iOS meta (apple-touch-icon, appleWebApp metadata) — check: curl rendered head
5. Full check: npm run build + commit

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
- Delete gmail.com seed college + test accounts at real launch (DEPLOY.md item 3).
- Re-point Girls' Closet/Boys' Den founding members to real hostel reps at launch (DEPLOY.md item 4).
- Manual phone QA: photo upload, two-account realtime chat, UPI QR (can't automate).
- Phase 21: thin-push pattern, token delete on login/logout, cache purge on auth change.
- AddMember profile-enumeration hole → sealed vouching (roadmap step 7).

## Failed attempts
(none this task)
