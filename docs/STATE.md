# STATE

## Goal
User-approved sequence (2026-07-12): Phase 28 (saves+alerts, IN PROGRESS) → Phase 29 (dark mode) → 🚢 ship Wave C → Play Store release → Wave D in plan order. Keep going without asking until user input is genuinely required.

## Now
OVERNIGHT AUTONOMOUS RUN (user asleep, full permissions incl. migrations+deploys, caveman output). DONE tonight: Phase 28 (95c0aac), Phase 29 dark mode (bcb7d7e), 🚢 Wave C DEPLOYED+verified, Phase 30 lost&found claims+matching (2b10d04, 0030), Phase 31 pool discovery+prorated joins (608a771, 0031 — note: fixed INSERT..RETURNING vs definer-subquery RLS race by adding owner_id disjunct to select policy). Phase 32 rent/lend DONE (19e2f97, 0032). NEXT: Phase 33 offers (deviation: offer panel on listing detail + plain-text DM drops instead of special chat cards — chat renderer untouched; accept → "sold at ₹X" via markSoldTo path) → 34 study groups (multi-party chat!) → 35 group-buy lifecycle → deploy Wave D batch. Morning report at end.

## Next
1. Wire SaveButton into app/group-buy/[id]/page.tsx — MUST Read the file first (Edit already bounced on unread file). Import SaveButton, add savedRow query (target_type 'group_order'), put button in a flex row with the "← Group-buys" link (~line 53).
2. SaveSearchButton into app/marketplace/page.tsx (module 'marketplace', query=q, filters={category} when set) and app/board/page.tsx (module 'board', filters={type}) — render under FilterBar/BoardFilter.
3. "Saved 🔖" link on app/profile/page.tsx (after KarmaProgress ~line 67).
4. Verify: tsc; Playwright dev:3001 (test accts in Facts): save listing → /saved shows → unsave; alerts row on /saved + delete; saved search (girl, q='cycle') → founder posts matching listing → girl notification exists + net._http_response shows push POST; 1h cap = saved_searches.last_notified_at set.
5. Commit Phase 28; update PROJECT.md tracker; then Phase 29 dark mode (class-based, tokens flip under .dark, toggle persisted, per CLAUDE.md design system), verify, commit; then attempt prod deploy (🚢 Wave C) — if classifier blocks, that's the manual moment: ask user to say deploy.
6. After Wave C: Play Store release build (signed AAB — needs user's keystore decisions) per approved sequence.

## Session earlier (all committed AND deployed to prod): sealed vouching verified adversarially (aa105cd); vercel.json syd1 region fix = 3-7x faster pages (78c8c95 area); speeder loader (78c8c95); Phase 27 global search (3f5f765) fully verified. Phases 20/21/22/14.5 closed earlier. Migrations 0021-0029 ALL applied.

## Facts (14.5 additions)
- Build APK: `cd android && ./gradlew.bat assembleDebug` (Java 21 system, sdk.dir in android/local.properties — gitignored)
- After changing capacitor.config.ts or public/: `npx cap sync android`


## Constraints
- Keep the gmail.com seed college until user finishes testing (delete only at real launch).
- User asked: production launch steps only with explicit go-ahead ("deploy" given 2026-07-09 — done).
- 2026-07-12, verbatim: "i allow to apply all upcoming migrations without asking me , and now lets move one to next phases until i have to actually do something manually"
- 2026-07-12 night, verbatim: "keep working , i am going to sleep , automatically go on to next phases when finished with a single phases , u have all my permissions for all upcoming requests , I will check back tommorow morning"

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
