# Play Store Release — everything prepared, what's left for you

## Status
- ✅ Upload keystore: `android/lockedin-upload.keystore` (gitignored). Credentials in `android/key.properties` (gitignored). **BACK BOTH FILES UP** off this machine (Google Drive is fine) — with Play App Signing a lost upload key is resettable, but it's a support ticket you don't want.
- ✅ Release signing wired in `android/app/build.gradle` — `./gradlew.bat bundleRelease` outputs a signed AAB at `android/app/build/outputs/bundle/release/app-release.aab` (verified with jarsigner).
- ✅ Privacy policy live at `/privacy` (Play requires this URL).
- ✅ Assets in `docs/playstore/assets/`: 6 phone screenshots (1080×1920), feature graphic (1024×500). Hi-res icon: `public/icons/icon-512.png`.

## Your manual steps (~30 min + review wait)
1. Create a Google Play developer account at https://play.google.com/console ($25 one-time). Use a personal Google account you'll keep.
2. Create app → name **LockedIn**, default language English (India), App, Free.
3. App integrity → accept **Play App Signing** (default — Google holds the signing key, our keystore is just the upload key).
4. Fill store listing with the copy below + upload assets from `docs/playstore/assets/` + icon `public/icons/icon-512.png`.
5. Privacy policy URL: `https://chiranjib.online/privacy`
6. Data safety form: answers below.
7. Content rating questionnaire: social/communication app, users can interact (chat), no UGC moderation gaps (we have report + moderator tools), no gambling/violence → typically rates Everyone/Teen.
8. Target audience: 18+ (college students).
9. Production release → upload `app-release.aab` → roll out. First review takes ~1–7 days.
   - New personal accounts must run a closed test with 12 testers for 14 days before production. If prompted: create a Closed testing track, share the opt-in link in your hostel group — you'll clear 12 testers in a day.

## Store listing copy

**App name (30 max):** LockedIn — Campus Super-App

**Short description (80 max):**
Buy, sell, split, and connect — everything on your campus, in one app.

**Full description:**
LockedIn is your campus in one app — built by a student, for students.

🛍️ Marketplace — buy and sell books, electronics, cycles and more, only with students from your own college. Rent things out by the day. Make offers, haggle in chat, rate each other after.

📌 Board — lost & found with smart matching and claim verification, plus campus announcements.

🤝 Group-Buy — organize bulk orders with hostel mates, split delivery fees automatically, track who's paid.

📺 Pools — share OTT/music subscriptions and split the cost, with prorated joining.

🚕 Cabs — find students to share cabs to the airport or railway station.

📚 Study — course study groups with built-in group chat, shared notes and a timetable.

🏃 Gate — hostel gate-pass runs: someone's going out, they pick up what you need.

💜 Match — a fun way to meet people on campus.

Your college email is your key — everything you see and post stays inside your campus. No ads, no data selling, no outsiders.

**Category:** Social · **Tags:** campus, college, marketplace
**Contact email:** chiranjib.dash2024@vitstudent.ac.in

## Data safety form answers
- Collects data? **Yes**
  - Personal info → Email address, Name: collected, required, app functionality, not shared
  - Photos: collected (user-uploaded listing/post photos), optional, app functionality, not shared
  - Messages: collected (in-app chats), app functionality, not shared
  - App interactions: not collected (no analytics SDK)
  - Device IDs: collected (push token), optional, app functionality, not shared
- Data encrypted in transit? **Yes** (HTTPS everywhere)
- Users can request deletion? **Yes** — in-app (Profile → Delete my account) AND web, no install needed: `https://chiranjib.online/delete-account` (enter this URL in App content → Account deletion). Email fallback stated in privacy policy.
- Data shared with third parties? **No**

## Later releases
Bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`, then `cd android && ./gradlew.bat bundleRelease`, upload the new AAB.
