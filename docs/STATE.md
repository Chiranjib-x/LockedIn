# STATE

## Goal
User-approved sequence (2026-07-12): Phase 28 (saves+alerts, IN PROGRESS) → Phase 29 (dark mode) → 🚢 ship Wave C → Play Store release → Wave D in plan order. Keep going without asking until user input is genuinely required.

## Now
MARKETING HOME DEPLOYED (facd019, 2026-07-13: flagship hero cards w/ live gate/marketplace stats + landing three-pillar showcase; prod smoke-checked — all three pillar strings live). A transient local DNS outage for api.vercel.com delayed the deploy ~10 min (recovered on its own). Earlier: UI REVAMP + QoL PASS DEPLOYED TO PROD (2026-07-12, user said "deploy"; smoke-checked: auth hero tagline + gradient wordmark live). Revamp = 5 phases of docs/design/REVAMP-PLAN.md (d0b109e..97e8e9f) + Play assets reshot (4467525) + QoL d93b9d4 (BackLink on 13 secondary screens, Button disabled state, chat inline send-error w/ draft restore). Explore tab wired to /search. Remaining: user's Play Console steps (docs/playstore/LISTING.md); purple QA image on Casio listing (user deletes in-app, then reshoot 2-marketplace.png). AAB needs NO rebuild (remote-load wrapper).

## Next
1. USER: say "deploy" → prod deploy makes /privacy live (required Play listing URL).
2. USER: Play Console steps per docs/playstore/LISTING.md (create $25 account, listing, data safety, upload android/app/build/outputs/bundle/release/app-release.aab).
3. USER: back up android/lockedin-upload.keystore + android/key.properties off-machine.
4. Deferred: Wave E (36-40 money) until real traffic; Phase 23 courses when study/notes demand it; rotate Firebase service-account key pasted in chat earlier.

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
- DECISION: lucide-react for UI chrome; emoji stays in user content + empty-state illustrations; typographic arrows stay in text links — why: mockup-grade "designed" feel without losing playfulness.
- DECISION: Solo Leveling "System" aesthetic owns dark mode (indigo-black + electric glow via .glow-primary/.gradient-brand utilities + --color-violet token); light mode stays warm cream — why: user directive 2026-07-12; karma is a leveling system, dark mode showcases it.
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
- Play Store prep (2026-07-12) — RESULT: `cd android && ./gradlew.bat bundleRelease` → signed AAB (jarsigner: "jar verified.") at android/app/build/outputs/bundle/release/app-release.aab; /privacy renders on dev; assets + LISTING.md in docs/playstore/. Rebuild for later releases: bump versionCode/versionName in android/app/build.gradle first.
- Prod deploy + QA sweep (2026-07-09) — RESULT: all 12 module pages OK, login OK, domain-reject OK on lockedin-swart-ten.vercel.app.
- Test boy/girl accounts in respective spaces — RESULT: symmetric isolation verified via UI both ways.
- Phase 20 PWA (2026-07-09) — RESULT: npm run build clean; Playwright on prod build: sw-registered/offline-fallback/install-card/dismiss-sticky all True.
- Migration 0021 applied + Phases 20/22 deployed (2026-07-10) — RESULT: prod /p/listing + /p/post 200 with data + CTA, leak-check clean (no seller/contact), og images 200 image/png, anon on /marketplace/<id> renders login form (Next streams RSC redirects as 200 + original URL — check content, not status, when probing gates).

## Open items
- Delete gmail.com seed college + test accounts at real launch (DEPLOY.md item 3).
- Re-point Girls' Closet/Boys' Den founding members to real hostel reps at launch (DEPLOY.md item 4).
- Manual phone QA: photo upload, two-account realtime chat, UPI QR (can't automate).
- Rotate Firebase service-account key (was pasted into chat during Phase 21b).
- Header overflows at ≤380px width for moderator accounts (5 icons + Log out) — components/header.tsx:60-77; consider moving Log out to Profile page. Regular users unaffected.

## Failed attempts
- Playwright gotcha (recurred twice this project): `button[type=submit]` matches the header's Log out form FIRST on authed pages — always scope to `main button[type=submit]`. Bounces to /login that look like auth bugs are usually this.
- RLS gotcha: UPDATE policies without WITH CHECK re-check USING against the NEW row — any transition that removes the actor's own claim to the row (e.g. runner_id = null) silently updates 0 rows. Use a security definer function for such transitions (claim_pickup / unclaim_pickup / trip_seats_taken pattern).
