# STATE

## Goal
Build Phase 20 (PWA installability): manifest, icons, service worker, install prompt, iOS meta.

## Now
Phase 21a CLOSED (2026-07-11): real push confirmed on the user's phone ({sent:1}, user-verified on lock screen, VIT account chiranjib.dash2024@vitstudent.ac.in). 🚢 Wave B retention core (PWA + Capacitor + web push) is live.

## Next
1. Phase 21b native FCM: user downloads Firebase service-account JSON (Project settings → Service accounts → generate key), firebase-admin in dispatch keyed by kind='fcm', @capacitor/push-notifications, APK rebuild
2. Roadmap: sealed vouching (AddMember enumeration hole); cab matching columns (destination_slug, depart_flex_minutes); Play Store signed AAB + listing
3. QUANTA 2026 (July 13–18): banner goes live automatically; user should onboard club Communities before Monday

## Facts (14.5 additions)
- Build APK: `cd android && ./gradlew.bat assembleDebug` (Java 21 system, sdk.dir in android/local.properties — gitignored)
- After changing capacitor.config.ts or public/: `npx cap sync android`


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
- Phase 20 PWA (2026-07-09) — RESULT: npm run build clean; Playwright on prod build: sw-registered/offline-fallback/install-card/dismiss-sticky all True.
- Migration 0021 applied + Phases 20/22 deployed (2026-07-10) — RESULT: prod /p/listing + /p/post 200 with data + CTA, leak-check clean (no seller/contact), og images 200 image/png, anon on /marketplace/<id> renders login form (Next streams RSC redirects as 200 + original URL — check content, not status, when probing gates).

## Open items
- Delete gmail.com seed college + test accounts at real launch (DEPLOY.md item 3).
- Re-point Girls' Closet/Boys' Den founding members to real hostel reps at launch (DEPLOY.md item 4).
- Manual phone QA: photo upload, two-account realtime chat, UPI QR (can't automate).
- Phase 21: thin-push pattern, token delete on login/logout, cache purge on auth change.
- AddMember profile-enumeration hole → sealed vouching (roadmap step 7).

## Failed attempts
- Playwright gotcha (recurred twice this project): `button[type=submit]` matches the header's Log out form FIRST on authed pages — always scope to `main button[type=submit]`. Bounces to /login that look like auth bugs are usually this.
- RLS gotcha: UPDATE policies without WITH CHECK re-check USING against the NEW row — any transition that removes the actor's own claim to the row (e.g. runner_id = null) silently updates 0 rows. Use a security definer function for such transitions (claim_pickup / unclaim_pickup / trip_seats_taken pattern).
