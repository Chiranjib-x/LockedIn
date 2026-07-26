# LAUNCH — the distribution plan

`DEPLOY.md` is the **technical** go-live checklist (Supabase URLs, seed cleanup, QA).
This file is the **distribution** plan: who sees the app, in what order, and the
gate that must hold before the next group sees it. They are complements — Stage 0
below is largely DEPLOY.md's checklist, re-sequenced by launch priority.

**Fill this in before using the plan:**

    FRESHER ARRIVAL (= W0): __________     (VIT Vellore, Fall 2026)

Every date below is relative to W0. Quanta 2026 (13–18 July) has passed — that
wedge is gone this cycle; fresher arrival is the next forcing function.

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
| 🧭 **VIT Compass** | **The wedge** | Public-read, no login, useful at n=1, solves a burning time-boxed pain. The only app that *cannot look empty*. Shareable by others **without endorsing you** — it's a map, not a favour. |
| 🎓 **CampusClubs** | **The distributor** | Clubs have their own audiences and their own reason to broadcast. A club posting "join us on CampusClubs" is **the club** marketing, not you. One signup (a secretary) brings 200 people. |
| 🔥 **LockedIn** / 🛍️ **CampusTrade** / 🏃 **GateRunner** | **The destination** | Need density to be any good. Launch **last**, into people who already have an account. |

---

## Stage 0 — Unblock the funnel (blocking; nothing below matters first)

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

### W-3 · Seed supply, zero audience
~10 friends put **real** things in: 25–30 CampusTrade listings, 10–15 real clubs,
both spaces founded, a few real gate runs. Frame as *"help me test this"* — never
*"launch"*. Empty shelves are what kill two-sided campus apps. Nobody outside this
group sees the app.

### W-1 · Compass only, artifact-framed
The one broad move. Post the **thing**, not the app:
*"Made a map of every building at VIT — with the names people actually use. No login,
just a link."* That is a contribution; "please download my app" is a request. Same
link, opposite reception. Seniors share it to juniors on their own, because it makes
**them** look useful.

### W0 · Fresher week — be where the question already is
Do not announce. In fresher groups the same questions run hourly: *where is GDN, where's
the mess, where do I collect my ID*. Answer with the link. One helpful reply beats ten
posts and costs zero dignity. Compass's built-in first-week checklist covers their month.

### W+1 · Clubs, one-to-one
Not a group post. DM or meet ~15 club secretaries with `/for-clubs` (already written for
this, opens without login). Pitch = analytics + announcements + lead capture, **not**
"support my project". Every club that signs up broadcasts for you, in their voice.

### W+2–3 · One beachhead, deep
Pick **one hostel block or one batch**. CampusTrade and GateRunner only work at
block-level density anyway. 300 students in one block daily beats 3,000 campus-wide
once. Full LockedIn gets introduced here, to people who already have accounts.

### W+4 · Campus-wide — only if the gates below held

---

## Gates — check before each stage

Failing a gate means **stop and fix**. The point of stopping early is that you have
not yet burned the campus.

- [ ] **After W-1** — 150+ Compass opens, ≥40% from non-friends.
      *Fails → the wedge isn't landing. Fix the map before anything else.*
- [ ] **D7 return rate ≥30%** of signups open again a week later.
      **The single most important number.** *Below this, more reach makes it worse. Do not proceed.*
- [ ] **Before W+2** — ≥8 clubs live with ≥1 real post each.
      *Fails → clubs aren't your channel yet. Don't launch the main app.*
- [ ] **Before W+4** — beachhead block shows something new daily.
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

- **Compass leads, not LockedIn** — the super-app is the worst first impression: 25
  routes, all empty. Compass is the only n=1-useful surface.
- **Web link, not APK, through W+3** — the unknown-sources warning costs more than a
  home-screen icon gains.
- **No launch post exists.** There is no day where LockedIn is announced. It accumulates.
- **Cut nothing from the product.** The features are fine; sequencing was the problem.
