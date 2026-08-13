# THEIR ROUNDS — final build spec

> **STATUS: BUILT, 14 Aug 2026.** All nine buildable rounds below now exist as
> real `GameModule`s on branch `overnight-polish` — see [HANDOFF.md](HANDOFF.md)
> §14 for what shipped, what deviated from this spec and why. The two the spec
> itself said not to build (§2.4 Mafia, §3.5 the playground game) were not
> built, and §2.2's audio round was already covered by Buzz In: Name That Tune.
> Everything below is kept as written — it's the record of what was decided
> and why, not a to-do list any more. Where the build diverged, the reasoning
> is in the relevant migration header or game file, not here.

The twelve free-text "invent a round" answers, turned into a spec ready to
implement as `GameModule`s against `src/games/registry.ts`. Every ambiguity
has been resolved by the host (Choolwe) as of 12 Aug 2026.

**Written by an isolated subagent per [HANDOFF.md](HANDOFF.md) §2.** Nothing
here is attributed to a person and nothing here is quoted verbatim — every
entry is a paraphrase of a mechanic. The authorship of each idea stays sealed
until the round is actually played on the day. If you are picking this up and
want to know who suggested what: don't. That reveal is the payoff.

**Source:** 8 `game_idea` rows + 4 `stolen_idea` rows, 5 distinct authors, 13
distinct ideas (one answer named two games). Read once, on 12 Aug 2026, by a
subagent; the reader script was deleted immediately after each read.

---

## 0. Engine status (re-verified 12 Aug 2026, mid-session)

The first pass of this document flagged four engine gaps. Three are now
closed — a concurrent build session landed `supabase/migrations/0007` with
exactly the primitives this document asked for. Re-read against the current
tree before trusting anything below:

| Gap | Status | Where |
|---|---|---|
| Deal one private item + sealed answer to one named player | **Closed** | `deal_private(p_round, p_idx, p_to, p_content, p_answer default null)` — host-only, writes `round_items` (`kind='private'`, `visible_to=p_to`) and, if `p_answer` given, `round_secrets` |
| Manual scoring (host adjudicates, app records) | **Closed** | `award_points(p_player, p_points, p_reason, p_round default null)` — host-only, straight insert into `scores` |
| Shared timer, so six phones agree on remaining time | **Closed** | `rounds.started_at`, stamped by `set_phase()`/`set_cursor()`; `RoundTimer.tsx` already reads it |
| Elimination / alive state | **Moot** | The one idea that needed it (§2.4) is being skipped — see §2.4. Every other "elimination" idea below scores by finishing position through `award_points()` at the moment of elimination, no persisted alive/dead state required. |

**One real gap remains, small:** `ContentSource` in `src/lib/game/types.ts`
only has `survey | deck | roles | none`. Three ideas below (§1.1, §1.2, §2.5)
are fed by `deal_private()`, which doesn't fit any of those four cleanly.
Recommend adding a fifth variant, `{ kind: "private" }`, so the launcher knows
these rounds need a per-item host action rather than one bulk deal.

Everything below is written against the *current* schema and RPC surface —
no more "needed" language except where a genuinely new function is called out.

---

## 1. Fully automatic — deal → submit → reveal → auto-score

### 1.1 Inverted acting prompt — *Act It Out, "Opposite Day" mode*

`deal_private()` sends the performer a prompt and its sealed answer is the
prompt itself. **Resolved: the performer acts the *opposite* of the card;
everyone else types a guess naming the *original* prompt.** Exact/normalised
string match against `round_secrets.payload.answer` auto-scores it — no host
adjudication needed.

- Phase map: `lobby` → `play` (performer sees prompt privately, others type
  via `submit_answer`) → `reveal`.
- Content: needs a curated deck of prompts with a *clean, unambiguous*
  opposite ("hot" ↔ "cold" works; most everyday actions don't have one). Budget
  curating ~20 before Saturday.
- Ship as a mode flag on the planned **Act It Out** module, not a separate
  `GameModule` id — same `PhoneView`, one branch.
- `ContentSource`: `{ kind: "private" }` (see §0).

### 1.2 Simultaneous spelling round

**Resolved: no elimination, no turns.** A word is dealt privately to a reader
(`deal_private`, `p_answer` = the correct spelling) who says it aloud; every
other phone submits its own spelling at the same time via `submit_answer`.
Reveal shows all spellings side by side — that's where the laughs are — then
auto-scores by exact match (normalise case/whitespace).

- Multi-item round: one deal per word, `set_cursor()` walks through ~10 words
  of escalating difficulty (store the tier in `round_items.meta`).
- Fully automatic once content exists. No host judgment calls during play.
- `ContentSource`: `{ kind: "private" }`.

### 1.3 Popularity-match round — *the six-person Family Feud*

**Resolved: score by matching the room, per player — not a pre-built ranked
board.** A prompt goes to everyone (via `deal_deck`, `kind='survey'` or a
curated prompt deck); everyone submits a short answer; on reveal, answers are
grouped by normalised text and every player in a group scores by that group's
size. This is the correct six-person-shaped version of "survey says": a real
board needs a hundred pre-ranked answers to fill, which six people can't
supply, so scoring shifts to "how many others agree with you" instead.

- **New function needed:** `score_agreement(p_round, p_idx)`, mirroring
  `score_plurality()` but grouping `submissions.value` (normalised) instead of
  `votes.value`, paying every member of each group `100 / distinct groups` or
  a flat award per matched pair — host's call on the exact formula.
- Normalise aggressively (lowercase, trim, strip punctuation, crude
  singularise) and give the host a manual merge tap on the reveal screen for
  near-misses ("pizza" vs "pizzas"), falling back to `award_points()` for any
  manual correction.
- `ContentSource`: `{ kind: "deck" }`.

---

## 2. Needs a small purpose-built piece, otherwise standard

### 2.1 Eligibility-filtered forfeit — Truth or Dare, Reckless tier

Random player is dealt a forfeit that names a specific real person in their
life to phone; the deck is gated so a forfeit that doesn't fit the target
(e.g. depends on relationship status) is never dealt to them. This constraint
arrived as an explicit condition in the original idea, not an afterthought —
treat it as a hard requirement.

**Resolved:**
- **Q4 — no eligible forfeit available:** re-deal (pick a different forfeit
  from the pool), never skip the turn or water down the content.
- **Q5 — refusal:** costs one of the day's two pass tokens, identically to
  however the base Truth or Dare pass economy is tracked (both should share
  one helper, not reinvent the accounting twice — likely an `award_points()`
  call with a small negative value and `reason='pass'`).

**Still needs one new function**, distinct from the now-closed gaps:
`deal_forfeit(p_round, p_idx, p_deck jsonb)` — host-only. Picks a random
claimed player, reads their eligibility attribute from sealed survey data
*inside* the definer function (never exposed to the client — a public column
on `players` would broadcast it to the room, which is worse than the problem
being solved), filters the supplied deck to items that attribute satisfies,
re-rolls the player if the deck has nothing eligible left, then calls the
same insert pattern as `deal_private()`.

- Reckless-tier: gate behind `room_is_open()` and pair with the same pass
  economy as Truth or Dare.
- Give the app a visible timer plus a host tap ("did it" / "chickened") →
  `award_points()`.

### 2.2 Song-clip identification, first-to-buzz — see §3 answer (a) below

Full mechanic resolved and written up as the answer to the host's follow-up —
see **§4.1**. Ships as content-source addition to the planned **Buzz In**
module, not a new game.

### 2.3 Progressive letter-reveal word game — this is the real game "Contact"

What was described matches, near rule-for-rule, the classic party word game
often called **Contact**: a word-holder reveals one letter at a time; a
guesser who thinks they know the word gives a clue (never the word) to signal
a second guesser; if the second guesser reads the same word from the clue,
both count down and say it together; the holder can block by naming the word
being signalled before the count finishes.

**Resolved — Q7, tie-break:** the guessing pair wins ties, not the blocker.
Keeps the round moving forward rather than rewarding the holder for stalling.

Build plan (unchanged from the first pass, still the right shape):
1. A **simultaneous secret reveal** between two specific players — both
   submit privately via `submit_answer`, neither's is shown until both rows
   exist, then both open at once. This is a new *trigger*, not new storage:
   watch for both rows, then flip `show_submissions` (or a per-idx flag) for
   just that pair.
2. A **blocking counter-submit** from the word-holder, racing the pair — on a
   tie (both land in the same tick), the pair wins per the resolution above.
3. A **letter-progress tracker** — how much of the word is public — as a plain
   integer in `rounds.config`, advanced by the host.
4. On a successful pair-match, advance the tracker and call `award_points()`
   for the pair; on a successful block, `award_points()` for the holder.

Still the most build-hours-per-minute-of-play idea on the list. If time is
short: build the letter tracker and the simultaneous reveal only, and run the
clue-giving and social deduction verbally, exactly as the group already plays
it — that's most of the feel for a fraction of the work.

### 2.5 Timed describe-and-guess — this is the real game "30 Seconds"

Confirmed: this is a named, standard party game — a card carries several
words, one describer has ~30 seconds to get their team to say as many as
possible without saying the words themselves, score = how many landed.

- Needs `deal_private()` (card goes to the describer alone — `deal_deck()`
  would show it to the guessers too, which breaks the game), `award_points()`
  for the host's live tally, and `rounds.started_at` for the shared 30s clock
  — all closed per §0.
- Shares its describer/timer loop with the planned **Fishbowl**'s first
  round; build one component, let both games use it.
- `ContentSource`: `{ kind: "private" }`.

---

## 3. Manual rounds — app runs timer/order/ledger, rules explained aloud

All four need only `award_points()` and, where timed, `rounds.started_at` —
both already exist. No new game logic required for any of these.

### 3.1 Speed card game

A physical shedding-type card game, played at increased pace. Real-time
simultaneous card play doesn't fit `deal → submit → vote → reveal` and
shouldn't be forced into it.

**Resolved — Q10:** a physical deck will be in the house. Ship as fully
manual: **app provides** a round timer and a "who went out first" ordering
tap feeding `award_points()`; **physical** is the deck itself.

### 3.2 Clap-signal elimination circle

Fully-formed rules, needs no design work: one clap continues the current
direction, two reverse it, three skip the next player; clapping out of turn,
or failing to clap on your turn, eliminates you; last one standing wins.

**App provides:** a live turn-and-direction pointer (index + boolean in
`config`, advanced by a host tap — genuinely good use of the TV) and an
elimination tap that calls `award_points()` immediately, scored by finishing
position (first out gets the fewest points, last standing the most) — no
persisted alive/dead table needed, elimination order *is* the score.
**Human:** adjudicating a bad clap. Never try to detect this with a
microphone.

### 3.3 Peer-rated performance

Each person performs in turn (karaoke-style); everyone else rates it;
ratings aggregate to a score. Reward commitment, not skill.

**Resolved — Q11: ratings shown per-rater, not averaged-only.** Matches the
app's established no-mercy register and is more dramatic at six players.

**App provides:** running order, a per-performance timer, and rating
collection via `votes` (`value` = a numeric string), hidden until the host
reveals (`show_votes`). On reveal, show each rater's number attributed to
them (not anonymised) alongside the average, then push the total to the
ledger via `award_points()`.
**Physical:** music source, and lyrics on the TV if available.

### 3.4 Rapid question-volley circle

Sat in a circle: asked a question, you must immediately ask the *next*
person a question instead of answering; hesitate and you have to answer the
one you were asked. Forfeit is sincerity, not performance — good fit for the
day's shape. Rules arrived fully formed.

**Resolved — Q12: hesitation window is 3 seconds.**

**App provides:** turn pointer, a 3-second hesitation clock the host arms per
turn (`rounds.started_at` + `RoundTimer`), and a log of who ended up
answering — feeds the end-of-day Awards directly.
**Human:** calling the hesitation.
Cheapest idea on the list to support, and one of the best-suited to six
people sat down. Ship early.

---

## 4. The two follow-up classifications and the audio mechanic

### 4.1 The audio round, fully specified (§2.2)

**What it's of:** a short opening clip of a song plays; whoever recognises it
buzzes in first to name it (title and/or artist); correct scores, wrong locks
that player out until the next clip.

**Where the audio comes from:** it is not fed by anything a player types or
submits live — it needs a small **curated clip library**, assembled ahead of
time by whoever's building this (most likely the host), the same way the
trivia and Spyfall decks in `src/config/decks.ts` are hand-authored. Budget
~15–20 short trimmed clips.

**Resolved — plays through the app, not from one phone's speaker.**
Concretely: the clip plays from whichever device is acting as the shared
screen/speaker for that hall (laptop or TV output), via a normal browser
audio element — not synced across six phones, because only one device needs
to actually play sound. The phones' role is purely the buzzer.

**Buzzer/lockout interaction:** identical to the already-planned **Buzz In**
module — the host starts the item, the clip begins playing on the shared
device, and every phone shows a single buzz button. The first tap wins,
resolved server-side by `submissions.created_at` ordering (never client-side
— six phones disagreeing about who was first is exactly the failure mode a
buzzer exists to prevent). A wrong buzz locks that phone out for the
remainder of that clip; buzzing reopens for everyone else, or the clip
resumes. Ship as one added content source on the Buzz In module rather than a
new game — the buzzer logic is identical, only the payload changes from a
trivia question to an audio file.

**One thing worth flagging, your call, not mine to decide:** the site's
repository is public (GitHub Pages, free tier — see HANDOFF.md §4/§6, the
same reason the bypass code and service-role key get special handling).
Bundling trimmed song clips as static assets means committing short pieces of
copyrighted audio into that public repo. Real-world risk for a six-person
private hangout is low, but it's a genuine departure from the "nothing
sensitive or rights-bearing in the public repo" pattern everything else here
follows. If you'd rather not do that, the fallback is: queue the songs from a
private source (a phone's own music app or a laptop playlist, not committed
to git) while the app still owns the buzzer/timer/scoring — same experience
for the room, no repo question.

### 4.2 Secret-role elimination idea (§2.4) — classification: skip

This is structurally the standard party game **Mafia** (also called
Werewolf) — a hidden minority faction who secretly know each other and
eliminate one person per "night" phase, alternating with an open "day" phase
where everyone else debates and votes someone out; the game ends when one
side can no longer act. As submitted, it carries **no distinguishing twist**
— it names the known game directly, and it was offered as something already
played before and wanted again, not framed as an original invention.

Per your own rule — build it if it was pitched as someone's original idea;
skip it if it's just Mafia by name — **this one skips.** No engine work
recommended for it. Two other planned games (Spyfall, The Chameleon) already
use the identical private-role-deal primitive (`deal_roles()`, closed since
0007), so the room still gets the "one of us is lying" feeling this idea was
reaching for, just under games already on the schedule. Worth a nod on the
day that the group's instinct and the plan agreed independently.

Six players is also thin for real Mafia specifically — the hidden faction
would be one person (too easy to spot) or two (too easy for them to win) —
which is a second, independent reason not to force it in.

### 4.3 Unidentified playground game (§3.5) — best-effort classification

Best guess: this belongs to the **tag/tig family** — someone is "it," tags or
touches another player to pass the role on, repeat, sometimes with a
freeze/unfreeze or safe-zone variant. I can't confidently pin one canonical
branded name to it — the way it was named reads as an informal, local/
colloquial label rather than a standardised title, unlike its neighbour in
the same answer (§2.5), which matched a specific well-known named game
cleanly.

**Recommendation:** don't build bespoke engine support for this one — run it
as a manual/verbal round exactly like the card game and clapping circle
(app supplies nothing but maybe a timer if the "30 seconds" element turns out
to belong to this game rather than to §2.5; ambiguous which one it modifies).
If you want it built with real state tracking rather than run verbally, the
one thing that would resolve it is knowing what happens *after* the touch and
what ends a round — with that, it's a small, cheap module.

---

## 5. Duplicates / overlaps — ship as modes of existing modules

No idea is a pure duplicate, but four should ship as a mode flag or added
content source on an existing planned module rather than a new `GameModule`
id, and one (§2.4) is being skipped outright:

| Idea | Ships as | Note |
|---|---|---|
| §1.1 inverted acting | mode on **Act It Out** | one flag, same `PhoneView` |
| §2.1 filtered forfeit | new deck + `deal_forfeit()` on **Truth or Dare** | needs the one new RPC above |
| §2.2 audio ID | content source on **Buzz In** | reuses the lockout logic wholesale |
| §2.5 describe-and-guess | shares component with **Fishbowl** round 1 | same describer/timer loop |
| §2.4 secret-role elimination | **skip** | see §4.2 |

That five of thirteen landed adjacent to games already on the list, and a
sixth is a straight rename of a known game, is worth mentioning on the day:
the room's instincts and the plan agree more than they diverge.

---

## 6. Build order

1. Add `ContentSource: { kind: "private" }` to `src/lib/game/types.ts` — one
   line, unlocks §1.1, §1.2, §2.5 for wiring.
2. **§3.2, §3.4** (clap circle, question volley) — zero new engine code,
   pure UI against `award_points()` + `RoundTimer`, high fun-per-minute.
3. **§1.2, §1.3** (spelling, popularity-match) — fully automatic once content
   exists; §1.3 needs the small `score_agreement()` function.
4. **§2.5, §1.1** as modes of Fishbowl / Act It Out.
5. **§2.1** (filtered forfeit) — highest payoff, needs `deal_forfeit()` done
   carefully; don't half-build the eligibility filter, a forfeit dealt to the
   wrong person is exactly the failure the idea pre-empted.
6. **§2.2** (audio) as a Buzz In content source — gated on the clip-library
   question in §4.1.
7. **§3.1, §3.3** (cards, karaoke) — manual, need only the scoreboard.
8. **§2.3** (Contact) — build the letter-tracker + simultaneous-reveal core;
   run the rest verbally if time is short.
9. **§2.4 skipped, §3.5 run manually** — no further engine work planned for
   either unless you decide otherwise after reading §4.2/§4.3.

Every one of the five people who submitted an idea has at least one round
shipping in steps 1–7.
