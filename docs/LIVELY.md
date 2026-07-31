# LIVELY — making the app feel as busy as it actually is

The app is not empty. It *looks* empty. Those are different problems and only one
of them is real.

Measured 2026-07-31:

| | |
|---|---|
| Students | **143** (+72, +30, +23 over three days) |
| In His Circle / Her Circle | **96** / 30 |
| Approved clubs | **77** |
| Buildings mapped | 48 |
| Live listings | **8** |
| Ever returned after signup day | **9 of 143** |
| Never posted anything | **124 of 143** |
| Push subscribers | **4** |

143 students and 96 people in one circle is a *busy* campus app. A new arrival is
shown "8 things for sale". That gap — between what is true and what is displayed
— is the whole of this document.

## The rule

**Every number shown must be true.** No invented users, no seeded activity in a
real college, no fake "12 people viewing this". The bots in `scripts/demo-bots.mjs`
stay confined to Demo College (`demo.invalid`, an email domain that cannot receive
mail, so nobody can ever sign up into it).

This is not squeamishness. On one campus of 40k where everyone knows everyone, a
single student spotting a fake account ends the product — and "I tried it, it's
fake" travels faster than any pitch. Liveliness has to come from surfacing what is
real, and there is plenty that is real and currently invisible.

---

## Phase 1 — Stop hiding the activity that already exists

The data is in the database and nothing renders it.

- [x] **L1 · Campus activity strip on /home** *(done bc28533)*. A live "happening now" list built
      from real rows: someone joined a circle, a listing went up, a club was
      approved, a pickup was claimed. Names only where the actor is already
      public (a listing's seller), never for private surfaces.
      *Done when:* /home shows ≥5 real events and the query is RLS-scoped.
- [x] **L2 · Lead with the biggest true number** *(done 2026-07-31)*. Below 20
      listings the Marketplace card reads "Buy, sell and rent with 143 verified
      students from your college" instead of the stock count. Original note: "8 things for sale" is the
      smallest true number in the database and it is the first thing a new
      student reads. Replace the marketplace count with the strongest honest one
      (students, clubs, circle members) until supply catches up.
- [x] **L3 · Empty states** *(partly done 2026-07-31)*. /timetable said "No classes
      today", which reads as "your timetable is set up and today is free" when it
      almost always means "you have not added one" — now two distinct messages.
      /chats was already an invitation with a browse button and was left alone.
      Original note: Audit each list route at n=0 and make
      it an invitation instead of a full stop. `/chats` says "No chats yet";
      `/timetable` says "No classes today". Both are correct and both read as
      broken.

## Phase 2 — Make the first 60 seconds produce something

87% of students have never posted. That is why supply is 8.

- [x] **L4 · First-post prompt** *(done — f1c4630)*. One specific ask to anyone
      with zero listings; disappears the moment they post.
- [x] **L5 · Share on post** *(done — f1c4630)*. The public preview link is
      offered at the one moment a seller wants reach.
- [x] **L6 · Ask for push at the moment it pays** *(done 2026-07-31)*. Mounted on the just-posted listing page: "Get told the moment someone makes an offer." Original note: 4 subscribers of 143 is why
      nobody returns. Ask right after a first listing ("get told when someone
      offers"), not on arrival.
- [ ] **L7 · Second-action nudge.** After a first post, suggest the next thing
      that fits what they did — not a generic tour.

## Phase 3 — Intuitive: remove the thinking

- [ ] **L8 · One-screen test.** For each main route, a new student should know
      what to do without reading. Walk all of them at 390px and list every screen
      that fails.
- [ ] **L9 · Name things as students say them.** "Group-buys", "Crews",
      "Toolbox" are internal names. Check each against what a VIT student would
      call it.
- [ ] **L10 · Cut a feature from the home grid.** Ten cards is a menu, not a
      home. Rank by real usage and demote the bottom three.

## Phase 4 — Retention, which is the actual bottleneck

- [ ] **L11 · Give people a reason to come back tomorrow.** Nothing in the app
      changes between visits unless someone else acts. A daily-true surface (new
      today, closing soon, your class next) is what makes a second open happen.
- [ ] **L12 · Weekly digest.** 143 email addresses; nothing has ever been sent to
      them. The only channel that reaches everyone.

## Gates

Do not move to the next phase until the current one holds.

- **After Phase 1** — a student who opens /home sees ≥5 things that happened
  without them.
- **After Phase 2** — listings pass 40, and >25% of new signups post something.
- **After Phase 3** — someone who has never seen the app can name what it does
  after 10 seconds on /home.
- **After Phase 4** — D7 return clears 30%. Below that, more reach makes it worse.

## The loop

`/loop` already exists and reads `docs/QUEUE.md`. These items are written in its
format, so the mechanism is the one already in the repo rather than a new one:
pick top-most open item → build → gate → commit → record evidence → next. An item
is `done` only with a real command and its real output on the Evidence line.
