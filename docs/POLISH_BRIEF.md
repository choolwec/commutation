# OVERNIGHT POLISH BRIEF — night of 14→15 Aug 2026

You are running autonomously while Choolwe sleeps. He goes to bed around
01:00 and wakes around 09:00. **The party starts at 13:00 today.** Every
hour you have is an hour he doesn't, so use them.

You have his explicit, blanket permission to improve this app — code,
copy, layout, content decks, anything — within the hard rules in §2. He
does not want to be woken, and he does not want surprises at 13:00.

---

## 0. Start here, in this order

1. **`docs/HANDOFF.md`, in full.** Non-negotiable. It is the map of this
   codebase, and several fixes in it only hold if you know why they're
   there. Do not skip it because this brief looks self-contained.
2. This file.
3. `docs/PLAN.md` for the Stage 2 design intent, and
   `docs/THEIR_ROUNDS.md` for the nine games the group invented.
4. Then run the full health check (§3) **before changing anything**, so
   you know the tree was green when you started and any failure later is
   yours.

---

## 1. What he actually asked for, in his words

> "go through thoroughly and check that there are no bugs at all. I don't
> want any surprises when we play and have to start fixing at the time."
>
> "do research on design ui/ux for this type of thing and improve the
> overall look and feel of everything. Attention to detail is key. My
> friends should be impressed with the level of detail and fullness of the
> app as a whole and the individual games."
>
> "and also just all of the things that will improve the app even
> slightly. It's time for that."

Three streams, in priority order: **find real bugs**, **raise the visual
and experiential quality everywhere**, **sweat the small stuff**. §5, §6,
§7 break these down.

The bar for "done" is not "it compiles." It's: six people pick this up at
13:00 having never seen it, and it feels finished.

---

## 2. Hard rules — these override everything, including his blanket permission

1. **Never read survey answer content.** Not into your context, not into
   a log, not into a screenshot you then look at. `survey_responses.value`
   is sealed to its author until a live round reveals it — HANDOFF §2 is
   the full statement of why. Scripts assert row *counts*, never
   `.select('value')`. If a task seems to need real content, it doesn't;
   use `/test`'s fake decks, which exist precisely for this.
2. **Never touch `game_room.unlocked_at`, `EVENT.unlocksAt`, or the
   bypass code.** Opening the Vault early, even for a second, is
   irreversible for all six people. `/test` (migration 0011) lets you
   drive any game without going near the real lock — use it.
3. **Never run `npm run reset`.** Read HANDOFF §8 for the time it deleted
   real answers. Also: never add a real `survey.ts` question id to any
   cleanup, purge, or test-key list in any script you write.
4. **Never claim or release one of the six real profiles.** Create a
   throwaway player (`__something__`, double-underscore wrapped, unlike any
   real crew id) and delete it in a `finally`. `scripts/check-engine.mjs`
   is the reference implementation of this pattern.
5. **Restore `game_room` when you're done with it.** Any script that sets
   `host_player` to a throwaway must set it back to `'choolwe'` and
   `active_round` to null in a `finally`, and delete `where is_test`.
6. **Content ceiling is unchanged.** Truth-or-Dare-style content can be
   bold, flirty, romantically pointed. No dare involves kissing, touching,
   or anything physical/sexual. Nothing explicit. No alcohol, ever. See
   `src/config/decks.ts`'s header.
7. **Don't restructure the engine.** No new architecture, no migration
   that rewrites existing behaviour, no swapping libraries, no moving off
   GitHub Pages (HANDOFF §4 explains why Vercel is unreachable from
   Zambia). Additive migrations are fine if a feature genuinely needs one.

---

## 3. The verification loop — run this after every meaningful change

```
npx tsc --noEmit          # must be silent
npm run lint              # 0 errors; ~27 pre-existing warnings is the baseline
npm run build             # all 11 routes prerender
npm run check             # 12 Stage 1 DB assertions
npm run check:engine      # 18 Stage 2 engine assertions
npm run live              # smoke-tests the DEPLOYED site
```

`npm run dev` should be left running; `npm run shots` needs it.

**The lint baseline is 27 warnings, all pre-existing** (`no-img-element`
— this codebase uses plain `<img>` deliberately, see `next.config.ts` —
plus `no-unused-expressions` in `check-engine.mjs`). If your count goes
up, that's you. Bring it back down.

---

## 4. How to verify properly — learn from three real misses

This project has burned itself three times on verification that looked
thorough and wasn't. Don't repeat these:

- **`/preview` is not a substitute for loading a real page.** It mocks
  `RoomContext` directly, so it never mounts `RoomProvider`. A render-loop
  bug in `useNow.ts` (`Maximum update depth exceeded`) survived a whole
  screenshot pass because the one screen being reviewed was the one screen
  that never ran the hook. It would have taken the console down on the day.
- **Typecheck and lint cannot see layout.** The rules sheet once rendered
  squashed against the top of the screen for ~0.5s on every first mount
  (a `position: fixed` child inside an animating `transform` ancestor).
  Clean tsc, clean lint, broken screen. **Look at screenshots.**
- **Driving a round with raw SQL is not driving a round.** A harness that
  did `update rounds set phase='reveal'` skipped `set_phase()`'s own
  `show_submissions := ... or phase in ('reveal','done')`, so every reveal
  it screenshotted looked sealed and five boards looked broken when they
  were fine. **Click the host's actual buttons in a real browser.**

The pattern that works, and that you should use: a **throwaway Playwright
script** that claims a throwaway profile, opens `/test` on a phone-sized
context and `/tv` on a laptop-sized one, launches a game, drives it
through its real phases via the host's real buttons, screenshots each
beat, asserts no `pageerror`, and cleans up in a `finally`. Write it, run
it, read the screenshots, then **delete it** — that's this repo's
convention for one-off diagnostics (HANDOFF §8). Name it `_something.mjs`
so it's obvious it's throwaway.

Two gotchas that will cost you 20 minutes each if you don't know them:

- The rules sheet **auto-opens the first time a device sees a given game**
  and intercepts clicks. Press `Escape` after launching, before clicking
  anything else.
- `/test` **hides `requiresTv` games** (Drawful, both Buzz Ins), so
  registry indices ≠ rendered button indices past index 20. Either
  temporarily widen `TestRoom.tsx`'s filter to `GAMES` (and **revert it
  before committing**), or compute the offset.

---

## 5. Stream one — hunt real bugs

The single most valuable thing you can do tonight. All 25 games render
without crashing (verified 14 Aug), so the remaining bugs are behavioural,
and they hide in phases nobody has clicked through.

Systematic approach — for each of the 25 games, walk the **whole** state
machine, not just the first screen:

- Every phase transition: `play → vote → reveal → done`, and the cursor
  advancing between items (`set_cursor`), including the **last** item, where
  "next" becomes "finish".
- The **non-host** view of every phase. Most bugs live here — the host's
  device is the one that got tested. Two browser contexts, one host, one
  guest.
- The **subject's** view where a game has one (Know Me Best, Centre Stage,
  Paranoia's recipient, Contact's holder, Hot Takes' clue-giver). "Can the
  person the round is about see the right thing?" has already been a real
  bug once (Know Me Best's reveal).
- **Zero/edge states**: nobody submitted, one submitter, everyone tied, the
  host leaves mid-round, a phone rejoins mid-round via the "still going"
  bar, a round with one player claimed.
- **Scoring**: does the leaderboard actually move, by the amount the copy
  promised? Several games score client-side by iterating `votes`/
  `submissions`; those are RLS-gated and only fully visible once
  `show_submissions`/`show_votes` are true. `set_phase('reveal')` opens
  both automatically — but any game that tallies *before* reaching reveal
  is counting only its own row. Check each scorer against that.
- **Realtime**: does a change on one device actually reach the others, and
  the TV? Backgrounding a tab kills the socket silently on iOS;
  `RoomProvider` refetches on `visibilitychange` for exactly this reason.

Fix what you find. Where a fix is risky or ambiguous, prefer the smaller,
more conservative change — it's the morning of the event.

Also worth a pass: `src/config/their-rounds.ts`'s **`FORFEITS`** deck.
Every card asks somebody to ring a real person. Read them with fresh eyes
and cut or soften anything that lands wrong for a platonic friend group;
this has never been reviewed since it was written.

---

## 6. Stream two — design research, then real improvement

He explicitly asked you to **research** how this class of app looks and
feels before changing things, rather than just restyling from instinct.
Do that first: look at how Jackbox, Kahoot, Psych, Heads Up and similar
party apps handle the phone-plus-TV split — what the phone shows while the
TV is the stage, how they signal "waiting on others", how they make a
lobby feel alive, how results and scores land with weight. Take what
genuinely applies to a six-person living room and leave the rest.

Then improve, everywhere:

- **Every game's phone view.** They were built fast, by three parallel
  sessions, to a shared contract — quality is uneven. Each should feel
  like a designed screen, not a form: real hierarchy, considered spacing,
  a background treatment that belongs to that game, states that animate in
  rather than appear. `src/games/tileArt.tsx` already defines each game's
  accent colour and motif — use them; they're currently only reaching the
  launcher tiles.
- **Fullness.** His word. Several screens are a card and a button floating
  in a lot of empty dark. Give them body: who's still deciding, what just
  happened, what's coming next, the round's own position in the set.
- **The nine TV boards that exist** (Drawful, Buzz In ×2, Fibbage, Centre
  Stage, Who Wrote It?, Paranoia, Best Answer, Chameleon, Survey Says) set
  the standard — animation, scale, a real reveal beat. **The other 16 fall
  back to `TvRoom`'s generic board.** Building more bespoke ones is
  high-value; `src/components/play/TvShell.tsx` gives you the frame, so
  each new one is mostly just its stage. Prioritise games the room will
  actually watch together.
- **Read `TvShell.tsx`'s header before adding any TV progress indicator.**
  A "3 of 6 have answered" counter cannot work on `/tv` — that client
  holds no profile, so RLS hides other people's rows and it reads a
  confident, permanent 0. The note records what a real implementation
  would need.
- **The connective tissue**: hub, launcher, leaderboard, awards, recap,
  the countdown, the claim screen, empty states, loading states,
  transitions between rounds. These are seen more than any single game.
- **Copy.** Read every string in the app as if you were one of the six
  reading it for the first time. It should sound like one voice.
  `src/games/rules.ts` in particular — those lines are what people will
  actually read to learn a game at 15:00 with music playing.
- **Accessibility and physical reality**: thumb-reach on a phone held
  one-handed, tap targets ≥44px, text legible in a bright room, TV text
  legible from three metres, `prefers-reduced-motion` respected.

Use the design skills available to you (`frontend-design`,
`ui-ux-pro-max`) rather than working from instinct alone — that's what
they're for.

---

## 7. Stream three — "anything that improves it even slightly"

Non-exhaustive, in no particular order:

- Sound. There is none anywhere. A buzzer, a reveal sting, a timer tick —
  even three well-chosen effects would transform how the room feels. Must
  be self-hosted or synthesised (WebAudio), never a CDN, and must respect
  a mute control.
- Haptics on phones (`navigator.vibrate`) for buzz-in, your turn, time-up.
- The hub the moment before 13:00 — the countdown hitting zero should feel
  like something.
- The Awards screen. It runs once, at the end of the day, and it's the
  last thing anyone sees. Make it land.
- The Evidence/photo-prompt system (migration 0007) — check it actually
  works end to end; it's the least-exercised feature in the app.
- Error and empty states. What does a phone with no connection show? A
  game with nothing left to deal?
- `/recap` and the Evidence gallery.
- Anything in HANDOFF's "Known simplifications" that now looks cheap.

---

## 8. Deploy protocol — push live, and never leave it broken

He chose progressive deployment. Each meaningful, verified piece:

1. Run the full §3 loop. All green.
2. Commit with a real message explaining *why*, in this repo's established
   voice — read `git log` first. End with
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
3. `git push origin master`. GitHub Actions deploys in ~45s.
4. **`gh run watch <id> --exit-status`, then `npm run live`.**
5. **If the deploy fails or `npm run live` fails: revert immediately.**
   `git revert <sha> && git push`. Then diagnose on a branch. The live
   site must never be left broken while he's asleep — that is the one
   outcome worse than doing nothing at all.

Commit in logical pieces, not one giant drop. If something is
half-finished when you stop, leave it uncommitted or on a branch, never
half-pushed to master.

---

## 9. Stop at ~09:00 and write it up

Stop making changes around 09:00. Then:

1. **Update `docs/HANDOFF.md`** with a new section for this session, in
   the style of §12–§16: what you changed, what you found, what you
   deliberately didn't do, and any trap a future session could fall into.
   Update the "Snapshot taken" line at the top. This file is why a fresh
   session can pick this project up cold — keep it that way.
2. **Write a short report for Choolwe to read when he wakes**, as an
   Artifact (he reads those on his phone). Lead with anything he needs to
   act on. Be honest about what you couldn't verify. If you found a bug
   you could not safely fix before the event, say so plainly and say what
   the workaround is on the day.
3. Leave the working tree clean and the live site green.

---

## 10. Out of scope tonight

- **The physical iPhone pass and the TV-from-across-the-room check.**
  Choolwe is doing both himself when he wakes. Don't burn time simulating
  them — but *do* make sure that when he runs them, they're likely to
  pass.
- The venue address (done: BKS Apartments, Main Street, Ibex) and the
  bypass code (set by him, deliberately not written down anywhere).
- Anything that needs a decision only he can make. Note it in the report
  instead of guessing.
- Waking him. Nothing tonight is worth it.
