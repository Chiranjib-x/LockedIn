# LAUNCH — the distribution plan

`DEPLOY.md` is the **technical** go-live checklist (Supabase URLs, seed cleanup, QA).
This file is the **distribution** plan: who sees the app, in what order, and the
gate that must hold before the next group sees it. They are complements — Stage 0
below is largely DEPLOY.md's checklist, re-sequenced by launch priority.

**Fill this in before using the plan:**

    GRAVITAS DAY 1 (= G0): __________      (VIT Vellore, ~Sept 2026)

Every date below is relative to G0. **Two forcing functions are already spent:**
freshers arrived June 2026 and Quanta ran 13–18 July. Gravitas is the next one,
~1–2 months out as of 2026-07-26 — enough runway to seed properly first.

Losing the fresher wave costs you the only population with *no incumbent habit*.
Everyone on campus now has their WhatsApp groups and their way of doing things.
So density-first is more important, not less: the beachhead is Stage 1 here, not
a late step.

---

## The thesis

The risk is not that nobody installs it. It is that **people install it, find it
empty, and never return** — and *"I tried it, it's dead"* travels faster on a
campus than any pitch. One first impression per student, ~40k students, no
re-rolls. **Reach spent before the app is dense is reach burned permanently.**

So the rule is not a marketing tactic, it is an ordering rule:

> Never let a person see the app before the app is good *for that person*.

That also dissolves the "looking desperate" problem — you stop needing to
convince anyone.

---

## The five apps play three different roles

They are not five equal products to launch together.

| App | Role | Why |
|---|---|---|
| 🎓 **CampusClubs** | **The lead + the distributor** | Gravitas is a club event, so clubs are both the customer and the channel. During a fest they *need* to reach people — the one moment they'll adopt a tool that does. A club posting "our Gravitas event is on CampusClubs" is **the club** marketing, not you; one secretary brings 200 people. Event check-in (barcode ID scan), volunteer recruiting, and the analytics dashboard are things WhatsApp **cannot do at all**. |
| 🧭 **VIT Compass** | **The zero-friction hook** | Public-read, no login, useful at n=1 — the only app that *cannot look empty*, and shareable by others **without endorsing you**. Repositioned: orientation is over, so its Gravitas job is **"where is this event happening"**, and its CAT-week job is **exam-hall finding** (assigned seating lands you in blocks you've never entered). |
| 🔥 **LockedIn** / 🛍️ **CampusTrade** / 🏃 **GateRunner** | **The destination** | Need density. Launch **last**, into people who already have an account from Gravitas. |

**The new wedge is "what WhatsApp does badly", not "what students don't know yet."**
The fresher wave is gone, so you can't sell to people who are new — you sell to people
doing something painfully. The incumbent being *bad* is the stronger wedge anyway:
buy/sell groups where messages scroll away and nothing is searchable; *"anyone going to
Katpadi Friday?"* lost in 40 messages; no way to run an event's attendance.

---

## Stage 0 — Unblock the funnel (blocking; nothing below matters first)

> **STATUS 2026-07-27 (verified against the live project, not assumed):** U4 ✅ done
> (Google provider returns 302→accounts.google.com, confirm-email ON, all four
> deep-link schemes allow-listed). U7 ✅ done (48 buildings, all 48 coords_verified).
> U10 ✅ effectively done (`gmail.com` is gone; only `vitstudent.ac.in` and the
> unregisterable `demo.invalid` remain). **Still open: U5** (rotate leaked creds),
> **F7** (VIT's Girls' Closet has 0 members), **U11** (neutral domain).
>
> **AND THE PLAN'S "no users yet" PREMISE IS DEAD:** there are already **18 real
> `@vitstudent` accounts**. Signups: 3 on 07-13, 4 on 07-14, 6 on 07-15, then 1 on
> 07-16, 1 on 07-22, 1 on 07-27. That shape — a burst, then flatline — is the exact
> failure this plan is built to avoid, and it happened before any deliberate
> distribution. Treat those 18 as the beachhead to re-activate, not as strangers to
> acquire: find out how many of them ever came back, because that number IS the D7
> gate below, measured on real users instead of projected.

All of these are **user-gated** — see QUEUE.md `LAUNCH BLOCKERS`. In order:

- [ ] **U4a** Finish Supabase Google provider. Per QUEUE U4 the button is *live and
      errors* until this is done — a stranger's first tap fails. Google sign-in with
      a `@vitstudent.ac.in` Workspace account is also **self-verifying**: best path.
- [ ] **U4b** Re-enable **Confirm email** (DEPLOY.md §2). Currently off — anyone can
      type a `@vitstudent.ac.in` address they don't own. Contradicts the project's own
      "no fake identities" rule. Must precede real users.
- [ ] **U4c** Allow-list per-app deep-link schemes (`com.lockedin.{gaterunner,campusclubs,campustrade}://auth/callback`) — blocks native Google sign-in in the APKs.
- [ ] **U5** Rotate the two leaked credentials (Vercel token, Firebase service-account
      key) **before** inviting a campus in. Both still live as of the last check.
- [ ] **U7** Refine the 17 estimated building coordinates at `/admin/campus`. Compass is
      the wedge; a fresher walking to a pin 200m off kills it in one try. All 24 exact.
- [ ] **U10** Delete the `gmail.com` seed college + test accounts (DEPLOY.md §3). A real
      student seeing "Demo College" in the picker is an instant credibility loss.
- [ ] **F7** Mint founding invites for Girls' Closet + Boys' Den at `/admin/spaces`
      (DEPLOY.md §4). Both currently at 0 members.
- [ ] **U11 · Neutral domain.** `map.chiranjib.online` pasted to 200 strangers reads as
      *some guy's side project*. ~₹1000/yr; the cheapest credibility purchase available.

**Do not wait for Play Store.** For the wedge a web link is *lower* friction than an
APK — the "install from unknown sources" warning is the most desperate-looking thing
in the funnel. Play Store (U2) matters from W+2, for push and home-screen presence.

---

## The stages

### G-6w (now) · Clear the blockers, seed supply, zero audience
Stage 0 above, plus: ~10 friends put **real** things in — 25–30 CampusTrade listings,
10–15 real clubs, both spaces founded, a few real gate runs. Frame as *"help me test
this"*, never *"launch"*. Empty shelves are what kill two-sided campus apps. Nobody
outside this group sees the app. **U8** phone QA happens naturally here.

### G-4w · Clubs, one-to-one — the whole ballgame
Not a group post. DM or meet ~15 club secretaries with `/for-clubs` (already written for
this, opens without login). **Timing is the pitch:** this is exactly when clubs start
planning their Gravitas events, so lead with what they need *now* — event pages,
volunteer recruiting, announcements to every member, and **check-in by scanning ID
barcodes** (nothing else on campus does this). Not "support my project".

Every club that signs up broadcasts for you, in their voice. This stage is the entire
distribution strategy — if it fails, nothing downstream works.

### G-2w · Clubs announce to their own members
You post nothing. Clubs push their Gravitas event pages to their members; those members
create accounts to RSVP. This is the reach you never had to ask for. Compass carries the
*"where is this event"* link alongside it.

### G0 · Gravitas week — peak usage, be useful not visible
Event pages, RSVPs, check-in scanning, live venue lookup. Your job this week is uptime
and moderation, not promotion. Answer questions with links; announce nothing.

### G+2w · Convert the fest traffic into the destination
Everyone who RSVP'd now has an account. *This* is when LockedIn and CampusTrade get
introduced — to people who already trust the name, not to strangers.

### G+2w onward (in parallel) · One beachhead, deep
Pick **one hostel block or one batch**. CampusTrade and GateRunner only work at
block-level density. 300 students in one block daily beats 3,000 campus-wide once.
With no fresher wave to hand you density, you have to manufacture it here.

### Campus-wide — only if the gates below held

---

## Gates — check before each stage

Failing a gate means **stop and fix**. The point of stopping early is that you have
not yet burned the campus.

- [ ] **Before G-2w** — ≥8 clubs live, each with ≥1 real Gravitas post or event.
      **The gate that decides everything.** Clubs are the entire distribution
      strategy now. *Fails → you have no channel; do not proceed to any broad move.*
- [ ] **D7 return rate ≥30%** of signups open again a week later.
      **The single most important number.** *Below this, more reach makes it worse. Do not proceed.*
- [ ] **G0 week** — ≥1 club actually runs check-in through the app.
      *Fails → the differentiated feature is unproven; don't build the pitch on it.*
- [ ] **Before G+2w** — Gravitas signups exist and D7 held.
      *Fails → don't introduce LockedIn/CampusTrade yet; the audience isn't real.*
- [ ] **Before campus-wide** — beachhead block shows something new daily.
      *Fails → campus-wide lands on an empty app. Hold.*
- [ ] **Before any real scale** — one more moderator recruited + a stated response time.
      Real users mean real reports; a bad first incident on a small campus doesn't wash off.

---

## Anti-desperation is structural, not tonal

Not a copy problem. Four rules:

1. **One post per group. Ever.** Repetition *is* the signal. If it's good, the second
   mention comes from someone else.
2. **Post the artifact, not the app.** A map, a listing, a club page — the app is the
   link, never the subject.
3. **Answer, don't announce.** Reply to a question that already exists.
4. **Let institutions carry it.** A club's announcement, a hostel rep, a senior telling
   a junior. Every one is someone else's voice.

**Never:** countdown/hype posts before there's anything to show · "guys please check it
out" follow-ups · asking friends to share · "we hit 100 users!!" milestone posts ·
posting in groups you aren't actually part of · leading with the APK.

**One allowed personal moment:** *"I got lost for two weeks in my first year, so I built
this."* A story, not a pitch. Use it **once**, in one place, never again.

---

## Decisions locked

- **CampusClubs leads, not LockedIn** *(revised 2026-07-26 — was Compass, when the plan
  still assumed a fresher wave)* — the super-app is the worst first impression: 25
  routes, all empty. With orientation over, Compass is a hook but not a launch; clubs
  are the only institutional distributor on campus, and Gravitas is when they need one.
- **Distribution rides on ~15 club secretaries, not on posts.** That is the whole plan.
  If clubs don't adopt, stop — do not substitute reach for the missing channel.
- **Web link, not APK, through W+3** — the unknown-sources warning costs more than a
  home-screen icon gains.
- **No launch post exists.** There is no day where LockedIn is announced. It accumulates.
- **Cut nothing from the product.** The features are fine; sequencing was the problem.
