# Campus Super-App — Phase-Wise Build Plan

A single app bundling five modules — **Marketplace**, **Lost & Found + Notices**, **Group-Buy Coordinator**, **Subscription Pooling**, and **Roommate / Study-Buddy Matcher** — plus room to add more. Every phase is scoped to fit in a single Claude Code session.

## The architecture (why this is buildable)

Don't build five apps. Build a **shared core once**, then each module plugs into the same shell and reuses common helpers:

- **Shared core (Phases 0–2):** scaffold, campus-email auth, profiles, app shell + home hub. Every module reuses this.
- **Reusable primitives, built on first use:** an **image-upload** component (built in Marketplace, reused by Lost & Found) and a **UPI collection** helper (built in Group-Buy, reused by Subscription Pooling).
- **Modules (Phases 3–11):** each is independent and *ships the moment it's done* — you can launch with one live and add the rest.
- **Cross-cutting finish (Phases 12–14):** unified notifications, a whole-app design pass, and deploy.

**Stack (baked into the prompts):** Next.js 14+ (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres + Auth + Storage + RLS) · `@supabase/ssr` · Vercel.

## The trust primitive

Auth is restricted to your college email domain (e.g. `@vitstudent.ac.in`). This is what makes "hyperlocal, trust built-in" real — a marketplace buyer, a roommate match, and a group-buy organizer are all verified students by construction. It's a Phase 1 decision everything else depends on.

## How to use this

- One phase per Claude Code session. Paste the prompt as-is.
- After each phase: verify it works, then `git commit`. That's your checkpoint to reset to if a later phase goes wrong.
- Each prompt tells Claude Code to read the existing code first and implement **only that phase** — that discipline is what keeps sessions efficient.

> **15 phases looks like a lot, but the first 3 are shared foundation reused by all five modules, and each module is only 1–2 phases because so much is reused.** That reuse is the entire payoff of building it as one app.

---

# CORE (Phases 0–2)

## Phase 0 — Scaffold & tooling
**Goal:** A running Next.js app wired to Supabase, deployable.
**Builds on:** nothing.

**Scope**
- Next.js 14+ App Router + TypeScript + Tailwind.
- `@supabase/supabase-js` + `@supabase/ssr`; typed server + browser client helpers in `/lib/supabase`.
- `.env.local.example` with Supabase URL/anon key placeholders.
- Folder structure (`/app`, `/components`, `/lib`, `/modules` for the feature modules).
- Minimal layout + landing page so it renders.

**Prompt**
```
Scaffold a new Next.js 14+ project (App Router, TypeScript, Tailwind CSS). Set up Supabase using @supabase/supabase-js and @supabase/ssr with separate server-side and browser-side client helpers in /lib/supabase. Add a .env.local.example with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY placeholders. Create a folder structure with /app, /components, /lib, and a /modules directory where each feature module will live. Add a minimal root layout and a landing page that renders "Campus" so I can confirm it runs. Scaffold only — no features. End with the exact commands to run locally and what to put in .env.local.
```

## Phase 1 — Campus-email auth + profiles
**Goal:** Only verified college-email students can sign up; each gets a profile.
**Builds on:** Phase 0.

**Scope**
- Supabase Auth via `@supabase/ssr`, **restricted to a specific email domain** (reject signups outside it).
- Signup / login / logout + App Router session handling (middleware for refresh).
- `profiles` table keyed to `auth.users.id`: name, batch, hostel/block, room (optional), avatar_url, contact_pref (e.g. WhatsApp number, shown on request).
- Auto-create a profile row on first sign-in; a `/profile` edit page.
- RLS: users read/write only their own profile; profiles readable by other authenticated users (needed for marketplace/matcher).

**Prompt**
```
Read the Supabase helpers first. Implement student authentication with Supabase Auth (@supabase/ssr), RESTRICTED to a single college email domain — reject any signup whose email isn't on that domain, and make the domain a config constant so I can change it. Include signup, login, logout, and correct App Router session handling with middleware. Create a profiles table (id references auth.users, name, batch, hostel_block, room nullable, avatar_url, contact_pref) with RLS so users read/write only their own row but any authenticated user can read others' profiles. Auto-create a profile row on first sign-in and build a /profile page to edit it. Update the header to show logged-in state. Only build auth + profiles.
```

## Phase 2 — App shell + home hub
**Goal:** The container all modules live in — nav, layout, a home that routes to each module.
**Builds on:** Phases 0–1.

**Scope**
- Persistent nav / layout with logged-in state.
- A `/home` hub: cards linking to each module (Marketplace, Lost & Found, Group-Buy, Subscriptions, Roommate Match) — some can be "coming soon" until built.
- Base UI conventions: shared card, button, and section styling other modules will reuse.
- Protected-route wrapper for module pages.

**Prompt**
```
Read the existing auth and layout code first. Build the app shell that all feature modules will live in. Create a persistent nav/header and layout reflecting logged-in state. Build a /home hub page with a grid of module cards linking to Marketplace, Lost & Found, Group-Buy, Subscription Pooling, and Roommate Match (render not-yet-built ones as disabled "coming soon" cards). Establish base UI conventions — a reusable Card, Button, and page-section component with consistent Tailwind styling — that later modules will reuse. Add a protected-route wrapper I'll use for module pages. Only build the shell and hub.
```

---

# MODULE 1 — MARKETPLACE (Phases 3–4)

## Phase 3 — Marketplace: schema + image upload + create/manage listings
**Goal:** Students can post items for sale with photos and manage their listings.
**Builds on:** Phases 1–2. **Builds the reusable image-upload component.**

**Scope**
- `listings` table: title, description, price, category, condition, images (array), seller_id, status (available/sold), created_at. RLS: publicly readable to authenticated users; editable only by seller.
- Supabase Storage bucket for listing images + a **reusable image-upload component** (multi-image, preview, delete) — this gets reused later.
- Create/edit listing form; "My Listings" page with mark-as-sold and delete.

**Prompt**
```
Read the profiles schema, the /modules structure, and the base UI components first. Build the Marketplace module's creation side. Create a listings table (title, description, price numeric, category, condition, images text array, seller_id references profiles, status enum available/sold, created_at) with RLS: any authenticated user can read, only the seller can update/delete. Set up a Supabase Storage bucket for listing images and build a REUSABLE multi-image upload component (upload, preview thumbnails, remove) in /components that other modules will reuse — keep it generic. Build a create/edit listing form using it, and a "My Listings" page where sellers mark items sold or delete them. Only build listing creation/management + the image-upload component.
```

## Phase 4 — Marketplace: browse, search, detail, contact
**Goal:** Buyers browse, filter, view, and contact sellers.
**Builds on:** Phase 3.

**Scope**
- `/marketplace` browse grid: image, title, price, category, "sold" state.
- Search (title/description) + category filter + price sort; filters in URL.
- `/marketplace/[id]` detail: gallery, full info, seller profile, contact action (reveal seller's contact_pref or in-app message stub).
- Empty/loading states.

**Prompt**
```
Read the listings schema and the create-listing code first. Build the Marketplace browse experience. Create /marketplace as a grid of available listings (image, title, price, category), with text search over title/description, a category filter, and a price sort — reflect filters in URL query params. Build /marketplace/[id] with an image gallery, full details, the seller's profile snippet, and a "Contact seller" action that reveals the seller's contact_pref. Show sold items as clearly marked. Include loading and empty states. Only build browse/search/detail/contact.
```

---

# MODULE 2 — LOST & FOUND + NOTICES (Phases 5–6)

## Phase 5 — Lost & Found + Notices: schema + create post
**Goal:** Post lost items, found items, official notices, and event announcements.
**Builds on:** Phases 1–2, 3 (reuses image upload).

**Scope**
- `posts` table with a `type` enum: `lost`, `found`, `notice`, `event`. Fields: title, description, images (reuse upload), location, event_date (nullable), author_id, status (open/resolved), created_at.
- Posting rules: `lost`/`found` open to all; `notice`/`event` open for MVP (leave a TODO to restrict to admins later via a role flag). RLS accordingly.
- Create-post form with type selector; reuse the image-upload component.

**Prompt**
```
Read the reusable image-upload component and base UI first. Build the Lost & Found + Notices module's creation side. Create a posts table with a type enum (lost, found, notice, event) plus title, description, images text array, location, event_date nullable, author_id references profiles, status enum (open/resolved), created_at. RLS: any authenticated user can read; authors can edit/delete their own; for MVP allow anyone to create any type but leave a clear TODO to gate notice/event to admins via a future role flag on profiles. Build a create-post form with a type selector that reuses the existing multi-image upload component (event posts show a date field). Only build post creation.
```

## Phase 6 — Lost & Found + Notices: searchable feed
**Goal:** One searchable feed, filterable by type, with resolve/claim.
**Builds on:** Phase 5.

**Scope**
- `/board` feed: chronological, each post showing type badge, title, image, location/date.
- Filter by type (Lost / Found / Notices / Events) + text search; filters in URL.
- Post authors can mark a lost/found post resolved; resolved posts visually de-emphasized.
- Detail view per post.

**Prompt**
```
Read the posts schema and create-post code first. Build the searchable board feed at /board: a chronological list of posts, each with a type badge, title, thumbnail, and location or event date. Add type filters (Lost, Found, Notices, Events) and text search over title/description, reflected in URL params. Let post authors mark their lost/found posts as resolved, and visually de-emphasize resolved ones. Add a per-post detail view. Only build the feed, filtering, and resolve action.
```

---

# MODULE 3 — GROUP-BUY COORDINATOR (Phases 7–8)

## Phase 7 — Group-Buy: schema + start & join orders
**Goal:** Someone starts a pooled order; others join with quantities.
**Builds on:** Phases 1–2.

**Scope**
- `group_orders` table: title, description, category (food/groceries/merch/prints…), organizer_id, deadline, status (open/closed/collecting), per-unit price (optional), created_at.
- `group_order_items` (join): order_id, user_id, quantity, note, amount_owed (computed or entered).
- Create-order flow; browse open orders; join with quantity; see participant list + running total.
- RLS: readable to authenticated users; organizer manages the order; users edit only their own join entry.

**Prompt**
```
Read the profiles schema and base UI first. Build the Group-Buy module's coordination side. Create a group_orders table (title, description, category, organizer_id references profiles, deadline, status enum open/closed/collecting, unit_price nullable numeric, created_at) and a group_order_items join table (order_id, user_id, quantity, note, amount_owed numeric). RLS: authenticated users read; organizer updates/deletes the order; each user manages only their own join entry. Build: a create-order form; a page listing open orders; a join flow where a user adds their quantity/note; and an order detail page showing all participants, quantities, and a running total. Only build order creation and joining — no payment yet.
```

## Phase 8 — Group-Buy: UPI collection + who-paid tracking
**Goal:** Collect each participant's share via UPI and track who's paid.
**Builds on:** Phase 7. **Builds the reusable UPI-collection helper.**

**Scope**
- A **reusable UPI helper**: given an amount + the organizer's UPI ID, generate a UPI deep link (`upi://pay?...`) and a scannable QR — this gets reused by Subscription Pooling.
- Per participant: their share, a "Pay via UPI" action, and a self-mark "I've paid" that the organizer confirms.
- Organizer view: paid/unpaid status per participant, total collected, close order when done.
- **No automated collection / no payment gateway** — MVP tracks manual UPI payments (leave a TODO for Razorpay/Cashfree if you later want auto-verification).

**Prompt**
```
Read the group_orders/group_order_items schema and organizer profile fields first. Build UPI collection and payment tracking for group-buys. First build a REUSABLE UPI helper in /components: given an amount and a payee UPI ID, it renders a "Pay via UPI" button producing a upi://pay deep link and a scannable QR code (use a lightweight QR library) — keep it generic for reuse. Add an organizer UPI ID field where needed. On the order detail page, show each participant their share with the Pay-via-UPI action and an "I've paid" self-mark; give the organizer a view to confirm each payment, see paid/unpaid status and total collected, and close the order. Do NOT integrate a payment gateway or auto-verify payments — track manual UPI payments only, and leave a clear TODO for Razorpay/Cashfree auto-verification later. Only build collection + tracking.
```

---

# MODULE 4 — SUBSCRIPTION POOLING (Phase 9)

## Phase 9 — Subscription Pooling
**Goal:** Manage shared subscriptions, per-person shares, and payment reminders.
**Builds on:** Phases 1–2, 8 (reuses UPI helper).

**Scope**
- `subscriptions` table: service_name, owner_id, total_cost, billing_cycle (monthly/yearly), renewal_date, seats, created_at.
- `subscription_members` (join): subscription_id, user_id, share_amount, paid_status, last_paid.
- Create a pool, add members, auto-split or custom per-person share.
- Reuse the UPI helper for each member's share; owner tracks paid/unpaid.
- Surface upcoming renewal + who still owes (in-app; ties into Phase 12 notifications).

**Prompt**
```
Read the reusable UPI helper and profiles schema first. Build the Subscription Pooling module. Create a subscriptions table (service_name, owner_id references profiles, total_cost numeric, billing_cycle enum monthly/yearly, renewal_date, seats int, created_at) and a subscription_members join (subscription_id, user_id, share_amount numeric, paid_status bool, last_paid). RLS: authenticated read; owner manages the subscription; members manage only their own entry. Build: create-a-pool form; add members with either an even auto-split of total_cost or custom per-person shares; per-member "Pay via UPI" using the existing reusable UPI helper plus an owner-confirmed paid/unpaid tracker; and a summary showing the next renewal date and who still owes. Only build the subscription pooling module.
```

---

# MODULE 5 — ROOMMATE / STUDY-BUDDY MATCHER (Phases 10–11)

## Phase 10 — Matcher: preference questionnaire
**Goal:** Students fill a habits/preferences profile to be matched on.
**Builds on:** Phases 1–2.

**Scope**
- `match_prefs` table keyed to user: sleep_schedule, cleanliness, study_style (quiet/group), noise_tolerance, smoking/food prefs, looking_for (roommate/study-buddy/both), plus a short free-text bio.
- A clean multi-step questionnaire writing to it; editable later.
- Opt-in flag (only users who opt in appear in matching).

**Prompt**
```
Read the profiles schema and base UI first. Build the Matcher module's preference side. Create a match_prefs table keyed to the user (sleep_schedule enum, cleanliness scale, study_style enum quiet/group, noise_tolerance scale, food_pref, smoking bool, looking_for enum roommate/study_buddy/both, bio text, is_opted_in bool). RLS: users write only their own; opted-in prefs readable by other authenticated users for matching. Build a clean multi-step questionnaire that writes to it and can be edited later, with an explicit opt-in toggle so only opted-in users appear in matching. Only build the questionnaire + preferences.
```

## Phase 11 — Matcher: matching + results + connect
**Goal:** Rank compatible people and let users connect.
**Builds on:** Phase 10.

**Scope**
- A scoring function comparing the current user's `match_prefs` against other opted-in users (weight the high-impact axes: sleep, cleanliness, study style, looking_for).
- `/matches`: ranked people with a compatibility score + a "why you match" summary and their bio.
- A "Connect" / express-interest action (reveal contact_pref on mutual interest, or a simple in-app request).
- Filter by looking_for (roommate vs study-buddy).

**Prompt**
```
Read the match_prefs schema and profiles first. Build the matching side. Write a scoring function comparing the current user's match_prefs to all other opted-in users, weighting the high-impact axes (sleep_schedule, cleanliness, study_style, and looking_for compatibility) most heavily. Build /matches showing ranked people with a compatibility percentage, a short "why you match" explanation, and their bio, filterable by looking_for (roommate vs study-buddy). Add a "Connect" action that either reveals contact_pref on mutual interest or sends a simple in-app connection request. Only build matching, results, and connect.
```

---

# CROSS-CUTTING FINISH (Phases 12–14)

## Phase 12 — Unified notifications (optional but recommended)
**Goal:** One in-app notification center across all modules.
**Builds on:** all modules.

**Scope**
- `notifications` table: user_id, type, message, link, read, created_at.
- Emit notifications from module actions: group-buy payment due / order closing, subscription renewal due, new match request, marketplace contact, resolved lost item.
- A notification bell + dropdown + a `/notifications` page; mark-read.
- In-app only (leave TODO for email/push).

**Prompt**
```
Read the module schemas (group_orders, subscriptions, match requests, listings, posts) first. Build a unified in-app notification center. Create a notifications table (user_id, type, message, link, read bool, created_at) with owner-only RLS. Emit notifications on key module events: group-buy payment due and order closing, subscription renewal approaching, new match/connect request, marketplace contact received, and a user's lost item marked resolved. Add a notification bell with unread count and dropdown in the header, plus a /notifications page, with mark-as-read. In-app only — leave a TODO for email/push. Only build the notification system and wire the emit points.
```

## Phase 13 — Design & responsive polish
**Goal:** Make all modules look intentional and work on mobile.
**Builds on:** everything.

**Scope**
- Consistent visual system across every module (spacing, type, color, components).
- Mobile-first responsiveness everywhere (students are on phones).
- Loading skeletons, empty states, error states where missing.
- Accessibility basics (focus, alt text, contrast).

**Prompt**
```
Read through all module pages and shared components first. Do a design and responsiveness pass across the whole app WITHOUT changing functionality. Establish one consistent visual system (spacing scale, typography, a small palette, unified card/button/nav styling) applied across every module so they feel like one product. Make every page mobile-first responsive. Add loading skeletons, empty states, and error states anywhere missing. Cover accessibility basics: focus states, alt text, contrast. No new features or data-logic changes. List changed files and summarize your visual decisions.
```

## Phase 14 — Production deploy + intake/QA
**Goal:** Live on Vercel with real data and an end-to-end QA pass.
**Builds on:** everything.

**Scope**
- Deploy to Vercel; production env vars against Supabase.
- Production Supabase Auth redirect/callback URLs; confirm the email-domain restriction works in prod.
- Storage bucket policies correct in prod.
- End-to-end QA checklist across all five modules.

**Prompt**
```
Read the env setup, Supabase auth config, and Storage setup first. Prepare for production deployment on Vercel. Give me precise steps to: connect the repo to Vercel, set production environment variables against my Supabase project, configure Supabase Auth redirect/callback URLs for the production domain, and confirm the college-email-domain signup restriction works in production. Verify Storage bucket policies are correct in prod. Produce an end-to-end QA checklist covering: restricted signup, create + browse a marketplace listing, post + resolve a lost item, start + join + UPI-track a group-buy, create a subscription pool, and complete the matcher questionnaire + view matches. No feature changes — deployment and verification only.
```

---

# "And more" — optional modules that slot into the same core

Each of these reuses the shared foundation (auth, profiles, shell, image upload, UPI helper) and is roughly 1–2 phases using the same pattern above:

- **Campus events calendar** — a shared calendar of fests/club events with RSVP (reuses posts/notices).
- **Ride / cab pooling** — post a trip (airport/station/home) with time + seats; others join and split fare via the UPI helper.
- **Mess menu + feedback** — daily menu, ratings, structured feedback to the mess committee.
- **Skill / tutor exchange** — offer/request help in a subject; match and connect (reuses the matcher pattern).
- **Anonymous confessions / peer board** — a moderated anonymous feed (handle moderation and routing-to-real-help carefully if it touches wellbeing).

## Launch strategy note

You don't have to finish all 15 phases before launching. The **Marketplace and the Lost & Found / Notices board are the strongest "always-on" anchors** — they give people a reason to open the app year-round. A sharp go-to-market is to ship those two first, get the campus using them daily, then roll out Group-Buy, Subscriptions, and the Matcher as updates to an app people already have.
