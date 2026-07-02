# Campus Super-App — Growth Build Plan (Part 2)

This continues `multi-college-superapp-build-plan.md` (**do Phases 0–14 there first** — scaffold, multi-tenant core, five MVP modules, notifications, polish, deploy). This document turns everything in `campus-superapp-product-plan.md` into buildable phases: **each phase fits one Claude Code session**, in dependency order, grouped into waves with explicit "🚢 SHIP" milestones so you're releasing continuously, not building in a cave.

## Working rhythm (this is what makes it easy)

- **One phase per Claude Code session.** Paste the prompt as-is. Every prompt tells Claude to read existing code first, build only that phase, and end with a manual test checklist — run that checklist yourself before moving on.
- **`git commit` after every passing phase.** Your reset point if a later phase goes sideways.
- **If a phase errors out:** don't pile fixes into a bloated session — commit nothing, start a fresh session with "Read the recent changes to X; the following error occurs: [paste]. Fix only this."
- **THE TENANCY RULE still applies to every new table:** `college_id` column, RLS via `get_my_college_id()`, inserts stamp college server-side. Each prompt that adds tables repeats this so sessions run standalone.
- **Ship at the 🚢 markers.** Each wave ends in a user-visible release. Announce it on campus; momentum is marketing.

## Master tracker

- [ ] Wave A — Trust & Communication (15–19)
- [ ] Wave B — Reach & Habit (20–25) ← the retention wave
- [ ] Wave C — The Living App (26–29)
- [ ] Wave D — Module Deepening (30–35)
- [ ] Wave E — Money (36–40) ← monetization switches on
- [ ] Wave F — Expansion backlog (41+)

---

# WAVE A — TRUST & COMMUNICATION (Phases 15–19)

The layer that makes strangers comfortable transacting. Highest priority after MVP.

## Phase 15 — Transactions + ratings
**Goal:** Deals get completed *to a person*, and both sides rate each other; ratings show on profiles.
**Builds on:** Marketplace (Phases 3–4).

**Prompt**
```
Read the listings schema, profiles, and get_my_college_id() first. Build transaction completion and ratings.

1) Change the "mark as sold" flow: the seller marks a listing sold TO a specific buyer (search same-college profiles by name, or pick from users they've interacted with). Store sold_to_id on the listing and create a row in a new transactions table (id, college_id, context_type enum marketplace/group_buy/subscription, context_id, party_a, party_b, completed_at). Apply THE TENANCY RULE (college_id column, RLS via get_my_college_id(), server-side stamping).

2) Create a ratings table (id, college_id, transaction_id, rater_id, ratee_id, stars int 1-5, comment nullable, created_at) with RLS: college-scoped reads, a rater can insert only for transactions they were party to, one rating per rater per transaction.

3) After a transaction completes, prompt both parties (via the existing notifications system) to rate each other. Build a small rating modal.

4) Show average stars + rating count on profiles and next to seller names on listings. Handle the no-ratings-yet state gracefully.

Only build transactions + ratings. End with a short manual test checklist.
```

## Phase 16 — Karma & badge tiers
**Goal:** One trust number per user, earned by good behavior, displayed everywhere identity shows.
**Builds on:** Phase 15.

**Prompt**
```
Read the ratings/transactions tables, profiles, and the notifications system first. Build a karma system.

1) Add karma int default 0 to profiles. Create a karma_events table (id, user_id, college_id, points, reason text, ref_type, ref_id, created_at) as an append-only log; karma on the profile is kept in sync when events insert (trigger or server logic — pick the simpler reliable option and comment why).

2) Award karma automatically: +10 completed transaction, +5 receiving a 4-5 star rating, +15 when a lost&found post the user authored as "found" is marked resolved, +3 organizing a group-buy that completes. Make point values a config constant.

3) Define badge tiers computed from karma (e.g. 0 New, 50 Active, 150 Trusted, 400 Campus Legend) as a helper function. Show the badge next to names on profiles, listings, chat headers, and match cards.

4) Notify users when they cross into a new tier.

Only build karma + badges. End with a short manual test checklist.
```

## Phase 17 — Report, block & moderation queue
**Goal:** Users can report content/people and block users; you get a moderation console.
**Builds on:** Phases 15–16.

**Prompt**
```
Read profiles, listings, posts, group_orders schemas and the admin patterns first. Build safety tooling.

1) Create a reports table (id, college_id, reporter_id, target_type enum user/listing/post/group_order/subscription, target_id, reason text, status enum open/dismissed/actioned, created_at) — TENANCY RULE applies. Add a "Report" action (with a reason picker) on listings, posts, profiles, and group orders.

2) Create a blocks table (blocker_id, blocked_id, created_at). Blocked users' listings, posts, chats, and match cards are hidden from the blocker — implement via a reusable query helper that excludes blocked authors (document that this is query-level filtering on top of RLS, since per-user blocking isn't practical in RLS alone).

3) Add is_moderator bool and is_banned bool to profiles. Banned users can log in but cannot create content or send messages — enforce server-side, show them a clear banner.

4) Build /admin/moderation (gated to is_moderator): a queue of open reports with the reported content inline and actions: dismiss, remove content (soft-delete flag rendered as "removed" everywhere), ban user. Log actions.

Only build report/block/moderation. End with a short manual test checklist.
```

## Phase 18 — In-app chat core (Realtime)
**Goal:** 1:1 realtime chat, first attached to marketplace listings, replacing instant contact-reveal.
**Builds on:** Phases 1–4, 17 (respects blocks).

**Prompt**
```
Read profiles, listings, the blocks helper, and Supabase client setup first. Build realtime chat with Supabase Realtime.

1) Tables: conversations (id, college_id, context_type nullable enum listing/match/group_order/subscription/study_group, context_id nullable, created_at), conversation_participants (conversation_id, user_id, last_read_at), messages (id, conversation_id, sender_id, body text, created_at). RLS: only participants read/write their conversations and messages; TENANCY RULE on conversations. Banned users cannot send (server-enforced).

2) On a listing detail page, replace the immediate contact-reveal with a "Chat with seller" button that finds-or-creates the conversation (context=listing) and opens it. Blocked pairs cannot start chats.

3) Build /chats: a conversation list (other party, context snippet e.g. the listing title + thumbnail, last message, unread indicator via last_read_at) and a thread view with realtime message subscription, optimistic send, and date separators.

4) Add three canned openers on listing chats ("Is this available?", "Can you do ₹__?", "Where can we meet?") as one-tap sends.

5) Keep an optional "Share my contact" action inside chat that reveals contact_pref — reveal becomes a choice, not a default.

Only build chat core + listing integration. End with a short manual test checklist.
```

## Phase 19 — Chat everywhere + unread nav badges
**Goal:** Chat becomes the communication rail for matches, group-buys, and subscription pools.
**Builds on:** Phase 18.

**Prompt**
```
Read the conversations/messages schema and the matcher, group-buy, and subscriptions modules first. Extend chat across the app.

1) Matcher: on mutual connect, auto-create a conversation (context=match) and route both users into it instead of revealing contact_pref; keep the in-chat "Share my contact" option. Auto-post a one-time icebreaker message into new match chats generated from their overlapping preferences (e.g. "You both study late and want a quiet roommate — say hi!").

2) Group-buy: a "Message organizer" button for participants (context=group_order).

3) Subscription pools: "Message owner" for members and join-requesters (context=subscription).

4) Add an unread-messages badge to the main nav (sum of conversations with messages newer than last_read_at), updating in realtime.

5) Emit a notification (existing system) on new message when the recipient has no active realtime session — keep it simple: on message insert, notify all other participants.

Only extend chat + badges. End with a short manual test checklist.
```

**🚢 SHIP — "The Trust Update":** ratings, karma badges, chat. Announce it; this release visibly changes how safe the app feels.

---

# WAVE B — REACH & HABIT (Phases 20–25)

Installability, push, virality, and the daily-open anchor. This wave is what makes usage *stick*.

## Phase 20 — PWA installability
**Goal:** The app installs to home screens and feels native.
**Builds on:** everything shipped.

**Prompt**
```
Read the Next.js app structure and layout first. Make the app an installable PWA.

1) Add a web app manifest (name, short_name, theme/background colors, display standalone, start_url /home) and a full icon set (192/512 + maskable).

2) Add a service worker with a sensible caching strategy for the app shell and static assets (use next-pwa or a hand-rolled worker — pick one and justify briefly in comments), plus a simple offline fallback page.

3) Add a tasteful install prompt: listen for beforeinstallprompt, show a dismissible "Add Campus to your home screen" card on the home feed after the user's second session (track sessions in localStorage), never nag after dismissal.

4) Verify iOS Safari basics: apple-touch-icon, status-bar meta.

Only build PWA installability. End with a short manual test checklist including how I verify install on Android Chrome and iOS Safari.
```

## Phase 21 — Web push notifications
**Goal:** Real push for chat, deadlines, and order updates — the retention nervous system.
**Builds on:** Phases 12 (notifications), 20.

**Prompt**
```
Read the service worker, the notifications table and its emit points, and the env setup first. Implement Web Push.

1) Generate VAPID keys (document the env vars). Create a push_subscriptions table (id, user_id, college_id, endpoint, keys jsonb, created_at) with owner-only RLS.

2) Ask for notification permission CONTEXTUALLY, not on load: the first time a user sends a chat message, tracks a deadline, or joins a group-buy, show a small pre-prompt explaining why, then request permission and save the subscription.

3) Extend the service worker with push + notificationclick handlers (deep-link to the relevant page).

4) Create a server-side send helper (web-push library) and wire it into the existing notification emit points: new chat message, group-buy status/payment events, subscription renewal approaching, tracked deadline within 24h, match request. Handle expired subscriptions by pruning them.

5) Add a notification preferences section in /profile (per-category toggles).

Only build push. End with a short manual test checklist.
```

## Phase 22 — Share cards & public previews
**Goal:** Every listing/post/event shared to WhatsApp looks great and recruits users.
**Builds on:** Phases 3–6 (and Events later inherits it).

**Prompt**
```
Read the listing and post detail pages and the auth gating first. Build shareable previews.

1) Using next/og (ImageResponse), generate dynamic OG images for listings (image, title, price, college name) and board posts (type badge, title, college name). Wire og:title/description/image metadata on those pages.

2) Create limited PUBLIC preview pages for shared links: an unauthenticated visitor sees the card content (title, image, price/type, college) plus a "Join with your college email to contact / see more" CTA into signup — full detail and all interactions stay behind auth. Keep RLS intact by serving previews from a dedicated server route that exposes only these whitelisted fields.

3) Add a Share button on listing/post detail: Web Share API where available, plus a WhatsApp share deep-link fallback and copy-link.

Only build share cards + previews. End with a short manual test checklist including checking the preview render in WhatsApp.
```

## Phase 23 — Course-code foundation
**Goal:** Course codes become a first-class object — powering textbook search now, study groups and notes later.
**Builds on:** Phases 3–4.

**Prompt**
```
Read the listings schema, colleges, and get_my_college_id() first. Build the course-code foundation.

1) Create a courses table (id, college_id, code text, name text nullable, created_at, unique(college_id, code)) — TENANCY RULE applies. Codes are crowd-sourced: created on first use, normalized uppercase-no-spaces.

2) Add course_code (nullable, FK to courses) to listings. In the create-listing form, when category is Books/Notes, show a course-code input with autosuggest from the college's existing courses (create-on-new).

3) Marketplace search: typing something that looks like a course code (regex heuristic) matches tagged listings first; add a course filter chip.

4) Seed a handful of VIT-style example codes in dev seed data.

Only build the course-code foundation + marketplace integration. End with a short manual test checklist.
```

## Phase 24 — Timetable (the anchor, part 1)
**Goal:** Students set up their weekly timetable; the app knows their next class.
**Builds on:** Phases 1–2, 23.

**Prompt**
```
Read profiles, colleges, courses, and the base UI first. Build the timetable module.

1) Add slot_config jsonb to colleges for per-college slot systems; seed VIT Vellore with an FFCS-style weekday slot grid (define a reasonable representative set of theory/lab slots with timings as seed data — make it easily editable) and give other seed colleges a generic hourly grid.

2) Create timetable_entries (id, user_id, college_id, day_of_week, slot_label nullable, starts_at time, ends_at time, course_code FK courses nullable, title, venue nullable) — TENANCY RULE; owner-only read/write.

3) Build /timetable: a weekly grid editor driven by the college's slot_config (tap a slot → add course code + title + venue; free-time colleges get start/end pickers) and a clean "Today" view.

4) A getNextClass() helper (used by the home feed later) returning the user's next entry today with time-until.

Only build the timetable. End with a short manual test checklist.
```

## Phase 25 — Attendance + "can I skip?" (the anchor, part 2)
**Goal:** Tap-to-mark attendance with live bunk math — the daily-open habit.
**Builds on:** Phase 24.

**Prompt**
```
Read timetable_entries, courses, and the Today view first. Build attendance tracking.

1) Create attendance_records (id, user_id, college_id, course_code FK, date, status enum present/absent/cancelled, created_at, unique(user_id, course_code, date)) — TENANCY RULE; owner-only.

2) On the Today view, each class gets one-tap Present / Absent / Cancelled marking (editable after). Support marking past dates from a course detail view.

3) Per-course attendance page: percentage (cancelled excluded from denominator), a visual bar against the required threshold (default 75%, stored per college with per-course user override), and the bunk math in plain words: "You can miss N more classes and stay above 75%" or "You must attend the next N classes to get back to 75%". Show total attended/held.

4) An attendance summary widget component (all courses, color-coded, worst first) built for embedding in the home feed next phase.

5) If any course drops below threshold, emit a notification (existing system) once per week at most.

Only build attendance + bunk math. End with a short manual test checklist covering the threshold math edge cases.
```

**🚢 SHIP — "The Daily Update":** installable app + push + timetable/attendance. This is the release that changes open-frequency from weekly to daily. Push it hard at semester start.

---

# WAVE C — THE LIVING APP (Phases 26–29)

The app starts feeling personal, searchable, and premium.

## Phase 26 — Personalized home feed
**Goal:** The home screen answers "what's happening on my campus right now, for me."
**Builds on:** Waves A–B.

**Prompt**
```
Read the home hub, getNextClass(), the attendance widget, notifications, chats, tracked deadlines, listings, posts, and group_orders first. Replace the static module grid with a personalized feed at /home.

Compose (server components, independent failure — one section erroring must not blank the page):
1) "Now" strip: next class with time-until + any attendance warning.
2) Unread chats (top 3) if any.
3) Deadlines soon: tracked recruitment/group-buy/subscription-renewal items within 7 days.
4) Fresh on campus: newest listings weighted toward categories the user has saved, posted in, or opened recently (simple heuristic from existing data — no new tracking infra; comment the heuristic).
5) Board highlights: today's notices/events + any "possible match" lost&found alerts.
6) Open group-buys closing within 48h.
Keep a compact module nav row at top so direct access never gets slower. Sections render skeletons while loading and hide when empty.

Only build the feed. End with a short manual test checklist.
```

## Phase 27 — Global search
**Goal:** One search bar across everything.
**Builds on:** all modules.

**Prompt**
```
Read the listings, posts, group_orders, subscriptions (discoverable ones only when that exists), study-related tables, courses, and profiles schemas first. Build global search.

1) Implement Postgres full-text search (tsvector columns + GIN indexes via migration) over listings (title/description), posts (title/description), and group_orders (title/description); use trigram/ILIKE for profile names and course codes. All queries inherit college scoping via RLS automatically.

2) Build /search with a single input (debounced), ranked mixed results grouped by type with tabs (All / Marketplace / Board / Group-buys / People / Courses), each result deep-linking to its page. Course-code-looking queries boost course-tagged results.

3) Put a search entry point in the header (expands on tap on mobile).

Only build search. End with a short manual test checklist.
```

## Phase 28 — Saves, wishlist & saved-search alerts
**Goal:** "Tell me when it appears" — converting unmet demand into retention.
**Builds on:** Phases 12, 21, 27.

**Prompt**
```
Read the notifications + push systems and the marketplace filter code first. Build saving and alerts.

1) Create saves (user_id, college_id, target_type enum listing/post/group_order/event, target_id, created_at) — save/bookmark buttons across those cards and details; a /saved page grouped by type.

2) Create saved_searches (id, user_id, college_id, module enum marketplace/board, query text nullable, filters jsonb, created_at) with a "Save this search & alert me" button on marketplace/board filter views.

3) On new listing/post creation, server-side match it against that college's saved_searches (keyword + filter match; keep the matcher simple and commented) and notify + push owners of matches, capped at one notification per search per hour.

Only build saves + alerts. End with a short manual test checklist.
```

## Phase 29 — Dark mode + experience polish pass
**Goal:** The 2 a.m. release.
**Builds on:** everything.

**Prompt**
```
Read the layout, Tailwind config, and shared components first. Add dark mode and a polish pass WITHOUT changing functionality.

1) Class-based dark mode: default to system preference, manual toggle in the header/profile, persisted choice. Apply dark variants across every shared component and module page — including OG-adjacent public preview pages, empty states, and skeletons. Check contrast in both themes.

2) Polish sweep: consistent skeletons everywhere, smooth 150-200ms transitions on interactive elements, momentum-free layout shifts (fixed image aspect boxes), and a once-over of tap-target sizes on mobile.

No new features. List changed files and summarize decisions. End with a short manual test checklist.
```

**🚢 SHIP — "The Feels-Premium Update."**

---

# WAVE D — MODULE DEEPENING (Phases 30–35)

Each MVP module gets its signature upgrade.

## Phase 30 — Lost↔found smart matching + claim verification
**Builds on:** Phases 5–6, 21.

**Prompt**
```
Read the posts schema and notification/push systems first. Build the lost&found intelligence layer.

1) Claim verification: found posts get an optional claim_question set by the finder ("what's engraved on the back?"). A "This is mine" button lets a claimant answer; the finder sees claim answers privately and can accept one, which opens a chat (context=post) between them and marks the post claim-pending.

2) Auto-matching: on new found-post insert, run a similarity match (pg_trgm on title+description+location, same college, open lost posts from the last 30 days); notify top-matching lost-posters "A found item may match yours" linking the found post. Same in reverse for new lost posts. Threshold conservative to avoid spam; leave a TODO for embedding-based matching later.

3) Resolving a found post as returned awards the finder karma (reuse Phase 16 hooks).

Only build matching + claims. End with a short manual test checklist.
```

## Phase 31 — Subscription open-slot discovery + prorated joins
**Builds on:** Phase 9, 18.

**Prompt**
```
Read the subscriptions module and chat first. Turn pools into a discoverable marketplace.

1) Add is_discoverable bool and open_seats int to subscriptions. A /subscriptions/browse board lists discoverable pools in the college (service, per-seat share, open seats, owner + karma badge, renewal date) with service-type filters.

2) Request-to-join flow: requester sends a short note; owner gets a notification + can chat (context=subscription) and approve/decline. Approval adds them as a member with a prorated first-cycle share auto-calculated from days remaining until renewal (show the math to both sides), then the normal share thereafter.

3) Owners with full pools get a nudge to open remaining seats when a member leaves.

Only build discovery + prorated joins. End with a short manual test checklist.
```

## Phase 32 — Rent & lend listings
**Builds on:** Phases 3–4, 15.

**Prompt**
```
Read the listings schema and the transactions/ratings flow first. Add renting.

1) Add listing_type enum sell/rent (default sell), price_per_day numeric nullable, deposit numeric nullable, and rental_status enum available/lent_out to listings. Create/edit form adapts; browse gets a Sell/Rent toggle filter; rent cards show ₹/day.

2) Lend flow: owner marks "Lent to @user until [date]" (creates a transaction, context=marketplace, flagged rental) → item shows lent-out; a "Mark returned" action completes it, triggers mutual ratings, and relists automatically. Notify the owner when the return date passes unreturned.

Only build rent/lend. End with a short manual test checklist.
```

## Phase 33 — Make-an-offer
**Builds on:** Phases 4, 15, 18.

**Prompt**
```
Read the listings, chat, and transactions code first. Build offers.

1) Create offers (id, college_id, listing_id, buyer_id, amount numeric, status enum pending/accepted/declined/countered, counter_amount nullable, created_at) — TENANCY RULE; visible only to buyer + seller.

2) "Make an offer" on listing detail and as a chat quick-action: buyer enters an amount; the offer renders as a special message card in the chat thread. Seller taps accept / decline / counter (counter creates a new pending state for the buyer). One active offer per buyer per listing.

3) Accepting an offer surfaces a one-tap "Mark sold to this buyer at ₹X" that completes the transaction (Phase 15 flow) with the agreed price recorded.

Only build offers. End with a short manual test checklist.
```

## Phase 34 — Study groups per course
**Builds on:** Phases 10–11, 18, 23.

**Prompt**
```
Read the courses table, matcher module, and chat (group support: conversations already have participants — extend to multi-member here) first. Build study groups.

1) Create study_groups (id, college_id, course_code FK courses, title, description, capacity int, meet_info text, creator_id, created_at) and study_group_members (group_id, user_id, joined_at) — TENANCY RULE.

2) /study-groups: browse/filter by course code (autosuggest), create a group, join/leave (capacity enforced), member list with karma badges.

3) Each group gets a group conversation (context=study_group) all members join; auto-post a welcome/icebreaker message on each join. Ensure the chat UI handles multi-participant threads (sender names shown).

4) Cross-link: course pages / course-tagged listings show "Study groups for this course".

Only build study groups. End with a short manual test checklist.
```

## Phase 35 — Group-buy status timeline + fee splitting
**Builds on:** Phases 7–8, 21.

**Prompt**
```
Read the group_orders module and push notifications first. Add order lifecycle and fee splitting.

1) Extend group_orders status to open/locked/ordered/arrived/completed/cancelled plus pickup_location text nullable. Organizer advances status; every participant gets a push on each change ("Your order has arrived — collect from H-Block 214").

2) Render a visual status timeline on the order page.

3) Add delivery_fee numeric nullable + a split_mode enum even/proportional; recalculate each participant's amount_owed accordingly (proportional = by their order value) and show the fee line-item transparently to everyone.

4) Completing an order creates transactions between organizer and each participant (Phase 15) enabling ratings, and awards organizer karma.

Only build lifecycle + fees. End with a short manual test checklist.
```

**🚢 SHIP — "The Power-User Update."**

---

# WAVE E — MONEY (Phases 36–40)

Real payments enter. Do these in order; test mode until the very end.

## Phase 36 — Events + RSVP
**Builds on:** Phases 5–6, 22.

**Prompt**
```
Read the posts/board module, verified-account TODOs, and share-card system first. Build a proper events module (distinct from event posts).

1) Create events (id, college_id, organizer_id, title, description, images text[], venue, starts_at, ends_at, capacity int nullable, is_paid bool default false, price numeric nullable, status enum draft/published/cancelled, created_at) and rsvps (event_id, user_id, status enum going/interested, created_at) — TENANCY RULE.

2) /events: upcoming list (chronological, filter free/paid), detail page with RSVP (capacity-aware), attendee count, add-to-calendar (.ics download), and share cards (reuse Phase 22 for events).

3) Organizers get a simple manage view: edit, cancel (notifies RSVPs), attendee list.

4) Paid events show price but purchasing is disabled with a "ticketing coming soon" note — payments arrive next phase.

Only build events + RSVP. End with a short manual test checklist.
```

## Phase 37 — Razorpay + paid ticketing
**Builds on:** Phase 36. ⚠️ Real-money phase: build entirely in **test mode**.

**Prompt**
```
Read the events module and env setup first. Integrate Razorpay in TEST MODE for paid event tickets.

1) Env vars for Razorpay test key id/secret (document them; never expose the secret client-side). Server route to create a Razorpay Order for an event ticket (amount from the event, server-side — never trust client amounts).

2) Razorpay Checkout on the event page for paid events; on payment, verify the signature server-side, then issue a ticket: tickets table (id, college_id, event_id, user_id, razorpay_order_id, razorpay_payment_id, status enum paid/checked_in/refunded, qr_token uuid unique, created_at).

3) Add a webhook route (payment.captured / payment.failed) with signature verification as the source of truth for ticket status — reconcile idempotently with the checkout callback.

4) Buyer sees "My tickets" with a QR code rendering the qr_token per ticket. Sold-count enforces capacity.

5) Document clearly in a MONEY.md: what's needed to go live later (Razorpay KYC, live keys, webhook URL swap) and that a platform take-rate (e.g. 3-5%) can be configured — implement the fee math as a config constant applied at order creation, defaulting to 0 for now.

Only build ticketing in test mode. End with a manual test checklist using Razorpay test cards, including a webhook test.
```

## Phase 38 — QR check-in + organizer dashboard
**Builds on:** Phase 37.

**Prompt**
```
Read the tickets/events schema first. Build event-day tooling.

1) Organizer-only /events/[id]/checkin: camera QR scanner (lightweight library) that reads a qr_token, validates it server-side (belongs to this event, status paid, not already checked in), marks checked_in with timestamp, and gives loud success/duplicate/invalid feedback. Include a manual token-entry fallback.

2) Organizer dashboard on the event manage view: tickets sold, revenue (gross, fee, net), check-in count live, attendee list searchable, CSV export.

Only build check-in + dashboard. End with a short manual test checklist.
```

## Phase 39 — Boosted listings
**Builds on:** Phases 4, 37 (reuses Razorpay).

**Prompt**
```
Read the marketplace browse/sort code and the Razorpay integration first. Build paid listing boosts (test mode).

1) Add boosted_until timestamptz nullable to listings. A "Boost this listing" action on the seller's own listings offers durations (e.g. ₹10/48h, ₹20/5d — config constants), pays via the existing Razorpay flow (server-created order, signature + webhook verification), and sets boosted_until on success. Record boost purchases in a boosts table for accounting.

2) Browse ranking: active-boost listings pin above the fold in their category with a subtle "Featured" label (clearly distinguishable, not deceptive); expire naturally.

3) Seller sees boost status + expiry on My Listings.

Only build boosts. End with a short manual test checklist with test cards.
```

## Phase 40 — Merchant deals & sponsored slots
**Builds on:** Phases 17 (admin patterns), 26.

**Prompt**
```
Read the moderation/admin gating and the home feed composition first. Build the local-merchant layer (founder-managed; no merchant self-serve yet).

1) Create merchants (id, college_id, name, category, logo_url, offer_text, details text, link_or_contact, starts_at, ends_at, is_active, created_at) — TENANCY RULE; managed via a new /admin/merchants CRUD gated to is_moderator.

2) A "Deals" section (/deals): active merchant cards for the college (logo, offer, details, contact/link) with category filters.

3) One clearly-labeled "Sponsored" card slot in the home feed rotating among active merchants (max one per feed load; label it Sponsored — non-negotiable) linking to the deal.

4) Track simple impression/click counts per merchant per day in a merchant_stats table so you can report reach to paying merchants.

Only build merchants. End with a short manual test checklist.
```

**🚢 SHIP — "Money is on."** Flip Razorpay to live keys (per MONEY.md) only when you have real event demand; boosts and merchant slots can start earning immediately after.

---

# WAVE F — EXPANSION BACKLOG (Phase 41+)

Build these when usage demands them — each follows the same pattern (core + tenancy rule + existing rails). When you're ready for one, ask me to expand it into a full phase prompt like the above:

- **Ride/cab pooling** (~1 phase): trips + join + UPI split via the existing helper; break-time demand spikes.
- **PYQ / notes vault** (~2 phases): course-code-tagged uploads (Storage) + browse/search; student-made content only, with takedown handling; karma for uploads.
- **Polls & campus pulse** (~1 phase): lightweight feed polls; later a sponsored-poll surface.
- **Moving-Out event mode** (~1 phase): a seasonal campus-wide sale window with its own landing + boosted visibility.
- **Referral karma** (~1 phase): invite links, both sides earn karma.
- **Daily digest push** (~1 phase): one smart morning push summarizing the feed.
- **Recurring group-buy templates**, **price guidance from sold data**, **availability-overlap matching**, **anonymous-until-match mode**, **embedding-based lost&found matching** — quality-of-life upgrades, one small phase each.
- **College-admin SaaS layer** (multi-phase, the Stage-4 monetization): verified official publishing, security-office lost&found console, hostel maintenance ticketing. Scope this with me when a college conversation gets real.

---

## The order matters — a final note

Waves A→E are sequenced by dependency *and* by strategy: trust before growth (Wave A), growth before personalization (B before C), depth before money (D before E). Resist jumping to Wave E early — boosts and ads on a low-liquidity app earn rupees and cost credibility. The 🚢 markers are your release train: five campus-visible launches over the semester beats one big-bang launch every time.
