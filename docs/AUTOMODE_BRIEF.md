# Overnight brief — Commutation, night of 13→14 Aug 2026

**Give this whole file to a fresh Claude Code session** (say: "read and follow
`docs/AUTOMODE_BRIEF.md`, starting with §1"). Choolwe will be awake for §1,
then going to sleep — front-load every decision you need into that exchange,
because after it you're on your own until morning.

You have full read/write access to this repo. The event this app is for is
**Saturday 15 August 2026, 13:00–20:00 — two days from tonight.** This is not
exploratory work on a side project; it's a production static site six real
people will use in person, and the live URL
(https://choolwec.github.io/commutation/) is one push-to-`master` away from
whatever you commit. Move fast, but read §2 before you touch anything.

**Read `docs/HANDOFF.md` in full before doing anything else.** It documents
the privacy architecture, the schema, every destructive mistake made and
fixed so far, and exactly why things are shaped the way they are. Several of
its rules are load-bearing — undoing one without knowing why it's there is
how the mistakes in its §9 happened the first time.

---

## 1. Ask first, then don't ask again

Below is everything Choolwe already decided tonight — don't re-ask these.
If anything else is genuinely ambiguous once you're into the work, ask *now*,
in this first exchange, while he's still here. Once he says go (or goes
quiet), stop asking — use your best judgement, write down the assumption
somewhere visible (commit message or the changelog in §6), and keep moving.

**Already decided:**

- **Content intensity (Truth or Dare, Never Have I Ever, etc.):** the
  "sexual is not the register" line in `src/config/decks.ts`'s header comment
  is loosened. Research what real dare/party-game content looks like and use
  that to push warm→real→reckless properly apart — bolder, more
  embarrassing, flirtier and more romantically pointed is all fair game.
  **Hard ceiling, not negotiable: no dare may involve kissing, touching, or
  anything physically/sexually intimate, and nothing explicit.** Truths can
  ask about crushes/attraction/dating opinions (that's talk, not an act).
  No alcohol, ever — that rule is untouched. Update the stale comment at the
  top of `decks.ts` once you've actually changed the register, so it
  describes the real boundary rather than the old one.
- **Bottom tab nav:** Choolwe floated 4 tabs (Huddle / Arena / Vault /
  Leaderboard) as a rough idea for what the picker should feel like, not a
  spec — he was thinking out loud, not testing this. Treat it as a strong
  starting direction: build toward it, but use your own judgement if
  something clearly better emerges, and say why in your changelog if you
  deviate.

---

## 2. Rules that don't bend, whatever else happens tonight

1. **Work on a branch, not `master`.** `git checkout -b overnight-polish`
   (or similar) and commit there all night. **Never push to `master`.**
   Every push to `master` triggers `.github/workflows/deploy.yml` and goes
   live at the real URL immediately — friends could open that link before
   Saturday. Push your branch, optionally open a draft PR with `gh pr create
   --draft` summarizing the diff, and leave it for Choolwe to review and
   merge in the morning. This is the single most important rule in this
   file.
2. **Never read sealed survey content.** `survey_responses.value` (and
   anything dealt from it into `round_secrets`) is off-limits to you, same
   as HANDOFF.md §2 describes for every other Claude session on this
   project — the reveals only work if genuinely nobody read them first,
   Claude included. You shouldn't need to touch this at all for anything on
   tonight's list; if a task ever seems to require it, stop and don't.
3. **Never add a real `survey.ts` question id to any cleanup/purge/test-key
   list** (`scripts/reset.mjs`'s `TEST_KEYS`, or any new script). This
   deleted real answers once — see HANDOFF §8. If a script needs throwaway
   data, invent an id that looks nothing like a real one.
4. **Use `/test` for all live game-testing**, not the real bypass unlock and
   not real survey data. It's already built (`src/app/test/`, visible on the
   hub when `me.id === 'choolwe'`), skips the unlock gate without touching
   `unlocked_at`, and every game that reads real survey content ships a
   `startTest` that deals obviously-fake content instead. If you add a 17th
   game or touch `start()` on an existing one, keep its `startTest` in sync.
5. **Don't touch:** the real bypass code (leave it for Choolwe to set by
   hand — HANDOFF §10, it needs to stay secret from this transcript too),
   `EVENT.unlocksAt`, `.env.local`, GitHub Actions secrets, or anything that
   calls `schedule_evidence` for real (that lays out the actual day's photo
   prompts against the real event window — don't fire it while testing).
6. **Database migrations are fine and expected** — this project's whole
   workflow this week has been additive migrations via
   `node scripts/migrate.mjs <file>` (transactional, rolls back clean on
   failure). If a fix genuinely needs one (see §3.1 below, it probably will):
   add a new numbered file (`0012_...sql` onward), never edit
   `0001`–`0011`, make every statement idempotent
   (`create or replace function`, `on conflict do update`, etc.), and verify
   it behaviorally (via `/test` or a targeted read-only check) before
   considering it done. This is a real production database two days before
   a real event — careful, not timid.
7. **Before calling anything done**, at minimum: `npx tsc --noEmit`,
   `npm run lint`, `npm run build` must all pass clean. Run `npm run
   check:engine` after any migration or RPC change. Skip `npm run check`,
   `npm run e2e`, and `npm run live` unless you have a specific reason —
   they hit the real live DB/deployment and the anonymous-signin rate limit,
   and aren't needed for local UI/content/game-logic work.
8. **Never run `npm run reset` unattended.**
9. Commit in small, reviewable chunks as you go (this repo's own git log is
   your style guide — terse, one real change per commit), not one giant
   dump at the end.

---

## 3. The punch list

Work roughly in this order — P0 is small, contained, and high-value; P3 is
the biggest and most open-ended. If the night runs out, stability and
clarity beat visual polish: better to ship fixed games in a slightly plainer
UI than a beautiful UI wrapped around the same three bugs.

### P0 — confirmed bugs, fix these first

**a. Truth or Dare's "Pass" doesn't actually pass.**
`src/games/vault/truth-or-dare/index.tsx`, `pass()` (~line 128) calls
`use_pass` (deducts 25 points, caps at 2/day, migration `0009`) and stops —
it never advances `item_cursor`, so the same card just sits there after
paying for it. Root cause is one layer deeper: advancing the round
(`set_cursor`, `supabase/migrations/0006_game_rpcs.sql` ~line 388) is gated
by `assert_host()` at the database level, so even a client-side fix that
calls `next()` after a successful pass would only work when the person
tapping Pass happens to be the host. `use_pass` itself is deliberately the
one self-service write in the whole schema (its own header comment says so)
— the gap is that self-service stops at deducting points and never reaches
the shared card. Recommended fix: a new migration adding one `security
definer` RPC (e.g. `pass_and_advance(p_round uuid)`) that does what
`use_pass` does *and* performs the cursor-advance/finish logic `set_cursor`
does, without an `assert_host()` check — so tapping Pass works instantly for
whichever player taps it, host or not. Wire the client to call that instead
of the current two-step `use_pass` + (host-only) `next`.

**b. Know Me Best: the person the round is about can never see the reveal.**
`src/games/vault/know-me-best/index.tsx`, `Phone()` (~line 295): the
`isSubject` check is evaluated *before* `revealed`, so the person on the hot
seat is stuck on "you're on the hot seat, sit tight" forever — even after
the host reveals, even after the round finishes. They never see the guesses,
never see their own answer shown back, never get to do anything. This is
the direct answer to Choolwe's "does everyone tap to award the 100, or just
the person it's about" question: right now it's neither — only the **host**
sees the "tap to award" grid (`isHost && guesses.length > 0`, ~line 193),
and the subject can't even watch. Fix the visibility bug first (subject
should see a reveal view once `revealed` is true — they don't need the
guess box, but they've earned the reveal). Then, since the subject is the
one who actually knows the nuance of their own answer, consider moving the
"closest guess, tap to award 100" control from host-only to
subject-first — same DB reality as above: `award_points`
(`supabase/migrations/0007_decks_and_evidence.sql` ~line 284) is also
`assert_host()`-gated, so letting the subject award for their own round
needs a narrow new RPC (e.g. one that checks the caller equals
`rounds.subject` for that round, not `assert_host()`), not just a client
change. Use your judgement on scope here — fixing the visibility bug is the
higher-value, lower-risk half; extending award-authority to the subject is
a nice-to-have on top if there's time and it tests cleanly.

**c. Paranoia's coin flip only plays on the host's phone.**
`src/games/vault/paranoia/index.tsx`: `flipping` (~line 99) is local
`useState` on whichever device taps "Flip: reveal it" / "Flip: stays
secret" — it animates there, then the RPC call updates `round.phase` for
everyone else, who never saw a flip at all; they just jump from the static
"watch their face" screen straight to revealed/done. Choolwe explicitly
wants this synced across all phones — make the flip a shared moment (a
transient phase value, or a realtime broadcast event every client
subscribes to) so all six phones show the coin spinning at the same time
and land together, not just the one that triggered it.

**d. No screen wake lock anywhere in the codebase.**
`grep -r wakeLock src/` returns nothing. HANDOFF.md §12 already flagged this
as unverified ("the wake lock itself was never built this session, worth
checking it's still on the list") — it wasn't. Rounds run for minutes at a
stretch with people not actively tapping (Paranoia, charades-style rounds,
anyone just watching); phones will lock mid-round on Saturday without this.
Add the Screen Wake Lock API (`navigator.wakeLock.request('screen')`),
scoped to whenever a room is active (inside `PlayGate`'s unlocked branch or
similar), with the standard re-acquire-on-`visibilitychange` handling since
the lock silently releases when a tab backgrounds. Small, contained, real
value — do this one even if nothing else in P3 happens.

### P1 — explain the games (this is systemic, not six one-off fixes)

Every "explain X" complaint (Spyfall — which Choolwe knows as "Skyfall,"
worth noticing that's what he remembers it as, so make sure the in-app name
and rules are unmissable regardless — The Deep End, Hot Takes, Chameleon,
plus "I don't get Fibbage" / "I don't get Best Answer") traces back to the
same root cause: nothing in the app explains a game's rules before or during
a round beyond a one-line blurb in the Launcher and whatever context happens
to be in the round copy. Fix the pattern once, not six times:

- Add a reusable rules affordance to `GameShell.tsx` (e.g. a "?" in the
  header that opens a short rules sheet/modal) — every one of the 16 games
  already renders through this shell, so this is a one-file change that
  reaches all of them.
- Show it automatically the first time a player hits a round for a game
  they haven't played this session, and make it reachable any time via the
  "?" so someone can re-check mid-round without asking the room to explain.
- Write a tight, plain-English blurb per game — what you'll see, what you
  do, how the reveal/scoring works. A few specifics worth getting right,
  since these are the ones flagged:
  - **Fibbage** — yes, broadly "vote your answer vs. the real one," but say
    the actual mechanic plainly: everyone privately writes a *lie* to fill
    the blank, the real fact (written by the game, not a player) is planted
    anonymously among the lies, and there are two ways to score — pick the
    real fact, or get someone to pick your lie. That second half is the
    part nobody figures out from playing once.
  - **Best Answer** — same shape as Fibbage minus the planted truth:
    everyone answers the same prompt, room votes funniest, the winner's
    author gets points scaled by vote count (Quiplash-style). Say that.
  - **The Deep End** — a real (anonymous, revealed-at-the-end) confession is
    read aloud; you react "same" or "never knew that"; the host reveals who
    wrote it once everyone's reacted. The confusion is probably just that
    nothing currently says this up front.
  - **Hot Takes** — diagnose honestly in your summary to Choolwe: this game
    structurally needs a real group (one hidden clue-giver + several
    guessers), so testing it solo or two-handed can't really demonstrate it
    — that's likely why it didn't land. Still tighten the copy (state up
    front that one person secretly knows an exact point on the spectrum and
    has to describe it near without naming it) so it's clear before a real
    group hits it Saturday.

### P2 — Chameleon and Never Have I Ever: make them better, not just clearer

Both were called out as needing real improvement, not just explanation —
use judgement here, and it's fine to look at how the actual board game "The
Chameleon" or similar party games (Decrypto, Codenames-adjacent) handle
this for proven ideas rather than inventing from scratch:

- **Chameleon** (`src/games/huddle/chameleon/index.tsx`): concrete ideas to
  weigh — a visible timer during the "say one word each" phase so it
  doesn't stall out; in the real board game, a caught chameleon gets one
  guess at the secret word for partial credit if they name it correctly —
  consider adding that (there's already a `score_odd_one_out` RPC path
  computing survival; extending it is a schema decision, treat with the
  same care as §2.6); sharper guidance in the round copy on what makes a
  clue too obvious vs. too vague, ideally with an example.
- **Never Have I Ever** (`src/games/huddle/never-have-i-ever/index.tsx`):
  notice while you're in there that `award_points` is never called anywhere
  in this file — nobody scores anything for playing it. Decide deliberately
  whether that's intentional (a pure talking-point game, no leaderboard
  stakes) or a real gap, and either document the choice or fix it. Beyond
  scoring: sharper, more escalating content per the loosened register in §1,
  and consider a lightweight "room can challenge an answer" mechanic if it
  fits without much new schema — but don't force a big feature into a
  simple game if it doesn't earn its complexity.

### P3 — UI/UX: the picker, the tabs, and making tiles look like something

This is the open-ended one — budget the rest of the night here once P0/P1
are solid, and don't let it regress P0/P1 to chase it.

- **Target structure:** a bottom tab bar with **Huddle / Arena / Vault /
  Leaderboard**, replacing `src/components/play/Launcher.tsx`'s current
  single scrolling host-only list and the bare "waiting on the host" screen
  everyone else currently gets (same file, the `!isHost` branch, ~line 54).
  Everyone should be able to browse all three halls — see what's available,
  see Arena greyed out without a TV, see the Vault sealed until unlock —
  even though only the host can actually launch a game. Leaderboard becomes
  its own persistent tab instead of a compact strip wedged above the host's
  list (`Leaderboard.tsx` already exists and takes a `compact` prop —
  reuse it).
- **Tile art:** every game module's header comment already documents a
  bespoke "VISUAL IDENTITY" (gold case-file look for Know Me Best, a dark
  spotlight for Paranoia, cyan/violet wash for The Deep End, tier-escalating
  color for Truth or Dare, hot pink for Best Answer, game-show gold for
  Fibbage, and so on) — that's real design work already sitting in each
  game file, just never surfaced in the picker itself, where every tile is
  currently an emoji plus two lines of text. Bring each game's real palette
  and motif into its Launcher tile — gradient, accent border, a small
  inline-SVG or CSS-drawn icon or pattern that echoes the in-game identity.
  Prefer CSS/inline-SVG over raster images or AI-generated art assets: this
  is a static export on GitHub Pages, and it should stay light, fast, and
  not depend on any asset pipeline, build step, or API key.
- Use the `frontend-design` and/or `ui-ux-pro-max` skills available in this
  environment for this pass — they're built for exactly this kind of
  distinctive-UI work.
- General layout/spacing/typography pass across the Launcher and
  `GameShell.tsx` too — "even the layout of them was not good" was part of
  the original complaint, not just "no art."
- **Verify visually, not just by typechecking:** `npm run shots`
  screenshots the UI at iPhone size via `/preview` (mock data, no Supabase
  needed) — use it liberally to self-review the tab bar and tiles without a
  live room. Actually look at the output images before calling this done.
- Keep `GameShell.tsx`'s existing contract (`icon`/`title`/`subtitle`/`dock`/
  `children`) stable if at all possible — all 16 games depend on its shape.
  If it has to change, update every game file that uses it and re-verify
  each one through `/test`, don't assume.

### P4 — optional, only if everything above is solid with real time left

`docs/THEIR_ROUNDS.md` has a full buildable spec for the group's 12 invented
rounds (already sorted, ready to implement against `src/games/registry.ts`)
— HANDOFF §12 flagged this as "the highest-value remaining work if there's
time." It's real, but it's new scope, not a fix to something broken — don't
let it compete with P0–P2 for time tonight.

---

## 4. How to verify without a live 6-person room

- **`/test`** — the primary tool tonight. Host-only (`me.id === 'choolwe'`),
  skips the unlock gate without touching the real `unlocked_at`, deals
  obviously-fake content for every game that would otherwise read real
  survey answers. Use it to actually play through every game you touch.
- **`/preview`** — renders components against mock data, no Supabase at
  all. Best for pure layout/visual iteration (and what `npm run shots`
  drives).
- For anything that needs multiple simultaneous players to actually prove
  out — Paranoia's synced coin flip especially, also any voting flow —
  open several browser tabs/profiles against the same test round rather
  than assuming a single tab proves it works. A fix that only ever gets
  exercised from one device is exactly how the current coin-flip bug
  happened in the first place.
- Run `npm run dev` and click through the real golden path for every game
  you touch, in a browser, before calling it fixed — per the standing rule
  that typechecking and lint verify correctness, not that a feature
  actually works.

---

## 5. Definition of done — what Choolwe should find in the morning

- A pushed branch (not merged, not `master`) with small, reviewable
  commits — a draft PR via `gh pr create --draft` is a nice-to-have on top,
  not required.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all passing clean
  on that branch's tip. `npm run check:engine` passing if you touched any
  migration or RPC.
- A short changelog (top of the PR description, or a new note under
  `docs/`) covering: what got fixed and why, what got changed by judgement
  call and what the reasoning was, anything you deliberately left alone and
  why, and anything still open that needs a human decision.
- `docs/HANDOFF.md` updated for anything a future session would need to
  know — new patterns, new gotchas, new migrations — same discipline its
  own §12 was written with. This is the durable reference; keep it that
  way.
- Nothing pushed to `master`, the real bypass code untouched, `EVENT.unlocksAt`
  untouched, no real survey content read, no destructive scripts run.

Good luck. Choolwe's trusting this to go well while he sleeps — the biggest
favor you can do him is leaving something *reviewable*, not just something
that compiles.
