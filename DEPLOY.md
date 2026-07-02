# Deploy & go-live

## Status
- Vercel project `lockedin` linked, env vars set (production + preview + development):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Preview deploys succeed. Production launch is a manual `vercel deploy --prod`
  after the checklist below.

## Before going to production

1. **Supabase Auth URLs.** Supabase → Authentication → URL Configuration:
   - Site URL → your production domain (e.g. `https://lockedin.vercel.app`).
   - Redirect URLs → add the production domain and any custom domain.
   (Without this, email-confirmation / password links point at localhost.)

2. **Email confirmation.** Decide: Supabase → Auth → Providers → Email.
   - Dev has it **off** for speed. For launch, turn it **on** and make sure the
     "Confirm signup" template links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
     (the app already handles that route).

3. **Remove the dev seed college.** `colleges` still has a `gmail.com` row so any
   gmail can sign up. Before real launch:
   ```sql
   delete from colleges where email_domain = 'gmail.com';
   ```
   Keep only real campus domains (VIT Vellore's `vitstudent.ac.in` is seeded).
   Clean the test accounts + demo data too if you want a fresh start.

4. **Girls' Closet founding member.** `space_members` currently seeds the dev
   test account as Demo College's founder. Re-point each college's Girls' Closet
   to a real founding member (a hostel rep) — see the seed block in
   `migrations/0004_spaces.sql`.

5. **Deployment protection.** Vercel → Project → Settings → Deployment Protection.
   Production is public by default; preview URLs are SSO-gated (that's why a
   plain `curl` of a preview hits the Vercel login wall).

## Go live
```
vercel deploy --prod
```
Then run the QA checklist against the production URL.

## End-to-end QA checklist
- [ ] Sign up with a **registered** campus email → lands on /home. Confirm email flow if enabled.
- [ ] Sign up with an **unregistered** domain → rejected with the college-domain message.
- [ ] Profile edit saves and persists across reload.
- [ ] Marketplace: post a listing **with a photo** (Storage upload works in prod), it shows in browse + detail; contact reveal works for a second account; mark sold/edit/delete.
- [ ] Board: post lost/found/notice/event; filters + search; mark resolved.
- [ ] Girls' Closet: a member sees it, a non-member cannot (verify with a second account); vouch someone in.
- [ ] Group-buy: create → second account joins → advance to collecting → UPI QR renders → who-paid tracking.
- [ ] Subscription pool: create → add member → split evenly → renewal countdown.
- [ ] Gate Runner: post a pickup → second account claims → requester taps "Received it" → reward UPI.
- [ ] Matcher: fill prefs, opt in, see ranked matches, connect → mutual reveals contact.
- [ ] Notifications: an action by one user produces a bell badge + entry for the other; opening marks read.
- [ ] Mobile viewport (390px): every page usable, bottom nav reachable, tap targets ≥44px.

## Next infra phases (from the growth plan)
- **Phase 14.5** — Capacitor Android wrap (APK/AAB + Play Store), pointing at the production URL.
- **Phase 20** — PWA manifest + service worker (reused by the wrapper).
- **Phase 21** — Push: FCM inside the Android app, web push fallback.
