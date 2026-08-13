# HANDOFF — read this first

For a fresh Claude session picking up this project with zero prior context.
Read this whole file before touching anything — several mistakes were made
and fixed along the way, and the fixes only hold if you don't undo them
without knowing why they're there.

**Snapshot taken:** Sun 9 Aug 2026, evening; **updated Wed 12 Aug 2026** when
Stage 2 was built (see §12); **updated again night of 13→14 Aug 2026** for an
overnight autonomous polish pass (see §13). If it's later than that, treat
anything time-sensitive below (survey counts, "not yet built") as stale and
re-verify rather than trust it.

---

## 1. What this is

**Commutation** — a two-stage web app for a hang with 6 people (Choolwe,
Chileleko, Joy, Latasha, Niza, Chibesa — 2 guys, 4 girls, platonic, no
drinking) on **Saturday 15 Aug 2026, 13:00–20:00**.

- **Stage 1** (info hub + a private, sealed survey) — **built, live, verified.**
- **Stage 2** (a synced multiplayer game console that unlocks automatically
  at 13:00 Saturday) — **built, 16 games, not yet dress-rehearsed.** Full
  original design in [PLAN.md](PLAN.md); what actually got built, and where
  it diverges, is §12.

The whole point of the survey: real confessions, hot takes, and predictions
from the group become the content for Stage 2's games (`Who Wrote It?`,
`Know Me Best`, `Paranoia`, etc.) instead of generic prompt decks.

**Live URL:** https://choolwec.github.io/commutation/
**Repo:** https://github.com/choolwec/commutation (public — see §4 for why)
**Supabase project:** `zpcpefzcujpqedhsnlrg` at supabase.com/dashboard

---

## 2. The one rule everything else serves

**Survey answers are never visible to anyone but their author until they
appear inside a live game round on Saturday. Not the other players. Not
Choolwe, who commissioned the app. Not Claude, working on it.**

This isn't a nice-to-have — the reveals ("who wrote this confession?") only
land if genuinely nobody has read them first, including whoever's building
the app. Concretely, this means:

- **Database-enforced.** `survey_responses` has row-level security scoped to
  `author = auth.uid()`. No query through the anon key — from the app, from
  a script, from anywhere — can return another person's answers. This isn't
  convention, it's Postgres refusing the query.
- **The hub shows counts, never content.** `players.answers_count`, kept in
  sync by a trigger, is the only signal exposed — "12 answered" never "here's
  what they said."
- **Claude's own discipline mirrors this.** Every verification script in
  `scripts/` asserts row *counts*, never `.select('value')`. This held even
  after getting the `service_role` key, which technically *can* read
  everything (see §6) — having the key doesn't change the rule.
- **The two Stage 2 tasks that genuinely need a human/AI to read content**
  (sorting confessions/dares into intensity tiers; turning one-line "invent
  a round" ideas into real game logic) are handled by an **isolated
  background subagent**, not the main chat thread. Only a content-free
  summary ("14 confessions sorted: 5/6/3") comes back to whoever's talking
  to Claude. This is the practical version of the plan's original promise:
  "I read them once, alone."
- **Nothing is self-tagged for intensity.** Choolwe was explicit: asking
  someone to grade their own confession is what makes them write a tame one.
  Sorting happens after submission, not at write-time.
- **No per-person content limits.** Full throttle for everyone — Choolwe
  knows the group and asked for this explicitly, so there's no per-person
  opt-out to build or honor.

If you're about to write code or a script that touches `survey_responses`:
stop and ask whether it needs to read `value` at all. Almost nothing does.

---

## 3. Stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js 16, React 19, TypeScript, Tailwind 4 | — |
| Rendering | **Static export** (`output: "export"` in `next.config.ts`) | See §4 — no server exists in production |
| Realtime/DB | Supabase — Postgres, Realtime, anonymous auth, RLS | Free tier easily covers 6 phones + a TV |
| Hosting | **GitHub Pages**, not Vercel | See §4 |
| Identity | Supabase anonymous auth, one stable uid per device | Makes RLS meaningful without anyone making an account |

---

## 4. Why GitHub Pages, and not Vercel (read this before "helpfully" switching back)

The app was originally built and deployed on Vercel. It didn't work: **Vercel's
entire `*.vercel.app` edge IP range (`216.198.79.0/24`, `64.29.17.0/24`) is
not routable from Zambia.** Confirmed on two independent networks, on both a
PC and a phone: `vercel.com` and `nextjs.org` both load fine (200), while
every deployed `*.vercel.app` hostname resolves via DNS and then times out on
connect. The app was correct the whole time — the link was just unopenable,
which would have been true for all six people, not just Choolwe.

So: the app was converted to a fully static export (every route was already
prerendered — this cost nothing), and moved to GitHub Pages, which was
verified reachable before committing to it. Cloudflare Pages and Netlify were
also confirmed reachable, in case Pages ever needs replacing.

**Consequences that are easy to trip over:**

- **The repo is public.** GitHub Pages on a free plan requires it. Checked
  before flipping visibility: no secrets, no survey content, and the anon
  key is safe to expose by design (RLS protects data, not the key). The
  `service_role` key and the survey unlock `bypassCode` are the two things
  that must never end up here — see §6 and the note in §9.
- **`basePath` is `/commutation`.** Pages serves a project site from a
  subpath, not the domain root. `next.config.ts` reads
  `NEXT_PUBLIC_BASE_PATH`, which is **only set inside the GitHub Actions
  workflow** (`.github/workflows/deploy.yml`), not in local dev. If you add
  a new file under `public/` or a new absolute link, it needs the same
  prefix treatment `manifest.webmanifest` and `layout.tsx` already get, or
  it 404s in production while working fine locally.
- **Deploys happen via GitHub Actions**, not a CLI push. Every push to
  `master` triggers `.github/workflows/deploy.yml`, which builds with the
  two `NEXT_PUBLIC_*` secrets (stored in **Settings → Secrets and variables
  → Actions** on GitHub, not `.env.local`) and publishes to Pages. Takes
  about a minute. `npm run live` smoke-tests the *deployed* site afterward —
  assets load under the subpath, Supabase connects, all six names render.
- **The old Vercel project was deleted.** `choolwecs-projects/commutation`
  no longer exists — confirmed via `vercel project ls`, only `ballers` and
  `mygm` remain on that account, unrelated to this project. There is nothing
  to reconnect and no reason to.
- **The Vercel-era git-identity issue is now moot.** Early on, Vercel's Git
  integration rejected builds where the commit author's email
  (`…+CCheelo@users.noreply.github.com`) wasn't a recognized team member.
  This repo's local git config was pinned to `choolwecheelo22@gmail.com` to
  fix it. That pin is still in place (harmless) but **no longer functionally
  required** — GitHub Actions doesn't care who authored a commit.

---

## 5. Database schema — read the migration history, don't just run the latest file

Four migrations, in `supabase/migrations/`, meant to be run **in order** on a
fresh project. Each represents a real bug found by testing against the live
database, not a hypothetical — the history matters because it explains why
the schema looks the way it does.

| File | What it does | Why |
|---|---|---|
| `0001_stage1_survey.sql` | `players`, `survey_responses` tables. RLS: `author = auth.uid()` on all four verbs. Trigger keeps `players.answers_count` in sync without exposing content. Seeds the six crew rows. | The base schema and the core privacy guarantee. |
| `0002_profile_takeover.sql` | `claim_profile()` / `release_profile()` RPCs (`SECURITY DEFINER`). | Without this, a mis-tapped profile — or Safari evicting `localStorage` after 7 days, which it does automatically — becomes permanently unclaimable by anyone, including the person it belongs to. The base RLS policy could only claim an *unclaimed* profile. |
| `0003_write_ownership.sql` | First attempt at fixing the bug below via revised UPDATE/DELETE RLS policies + a `holds_profile()` helper. | **Superseded — read the next row before trusting this one.** When run, its function landed but its policies silently did not fully apply; a behavioral test caught this, "Success. No rows returned." in the SQL editor did not. |
| `0004_save_answer_rpc.sql` | The actual fix, as a single `SECURITY DEFINER` function `save_answer()` doing delete-then-insert. This is what the client calls via `supabase.rpc('save_answer', ...)` — **never** `.upsert()`/`.update()` directly against `survey_responses`. | The bug: `survey_responses` is unique on `(player_id, question_id, answer_index)`, but rows are owned by `author`. A row inherited from a previous session (profile takeover, or a cleared Safari session) made every future save to that exact question fail with a silent 403 forever — `ON CONFLICT DO UPDATE` needs the conflicting row to be `SELECT`-visible, and reads are deliberately author-scoped. `save_answer()` sidesteps this with one explicit ownership check instead of four RLS policies that all had to agree. Reads are untouched: taking over a profile lets you overwrite past answers blind, never read them. |

**If setting this up on a fresh Supabase project:** run all four in order,
watch for "Success. No rows returned." on each, then run `npm run check`
immediately — it asserts 13 things behaviorally, including the exact
inherited-row scenario that 0003 failed to actually fix. Don't trust the SQL
editor's success message alone; 0003 is the proof it can lie.

---

## 6. Credentials — what exists, and where it's allowed to live

| Credential | Value lives in | Rules |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` (local dev) + GitHub Actions secrets (build) | Safe to expose — it's a URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above | Safe to expose by design — RLS protects data, not this key. It's already sitting in the public deployed JS bundle. |
| `SUPABASE_SERVICE_ROLE_KEY` | **`.env.local` only.** Never committed, never `NEXT_PUBLIC_`, never a GitHub Actions secret. | **Bypasses RLS entirely.** Verified working via a count-only check (`service_role` sees all 77 rows across every author; a fresh anon session sees 0) — never used to read actual answer content. Only for privileged one-off scripts, run by an isolated subagent per §2. For Stage 2's actual live-reveal runtime, this key does **not** need manual distribution — Supabase auto-injects it into every Edge Function's environment. Was pasted into a chat session once; Choolwe was told he can regenerate it in the dashboard (Settings → API → regenerate) for cleaner hygiene, optional, not yet done as of this snapshot. |
| Survey unlock `bypassCode` | Hardcoded string in `src/config/event.ts` (currently `"letmein"`, **still unchanged**) | **Known issue, flagged, not yet fixed:** this file is in the now-public repo, so this "secret" bypass code is readable by anyone who looks at the source. Before Stage 2 wires up `/unlock` to actually consume it, move it out of a public source file — e.g., a Supabase-checked value via RPC — rather than shipping it as-is. |
| GitHub | `gh` CLI authenticated as `choolwec` | Used for repo creation, secrets, Pages API. |

---

## 7. Repo map

```
docs/
  PLAN.md          ← the full original design: Stage 1 + Stage 2, all ~25 games,
                       the three "halls" (Vault/Huddle/Arena), build priority,
                       timeline. Read this before starting Stage 2 work.
  HANDOFF.md       ← this file

src/config/
  event.ts         ← EDIT THIS for venue/schedule/bypassCode. One-line changes.
  crew.ts          ← the 6 players: id, name, default emoji/color
  survey.ts        ← the question bank: 8 sections, ~44 question objects
                       (some repeatable up to 3 slots). Each question has a
                       `feeds` field documenting which Stage 2 game will
                       consume it — not wired up yet, just documentation.

src/lib/
  supabase/client.ts  ← browser client + ensureSession() (anon auth)
  player.tsx          ← PlayerContext: roster, `me`, claim()/release()/updateMe()
  useAnswers.ts       ← survey answer state: load, debounced autosave via
                          save_answer() RPC. See the `meId` comment before
                          touching the load effect — that's the typing-bug fix.

src/components/
  Gate.tsx           ← routes to setup-screen / claim-screen / children
  ClaimScreen.tsx    ← "Who are you?" — includes profile-takeover UI
  Hub.tsx            ← the landing page: countdown, roster, logistics
  Countdown.tsx      ← useSyncExternalStore-based clock (not useState+interval —
                         that tripped a "setState in effect" lint rule)
  survey/Survey.tsx  ← the 8-section flow: resumable, all-skippable, autosave
  survey/Field.tsx   ← renders each question kind (short/long/choice/person/
                         emoji/color/scale)

src/app/
  page.tsx           ← / — the hub
  survey/page.tsx    ← /survey
  preview/page.tsx   ← /preview — renders real components against mock data,
                         no Supabase needed. Use for quick visual checks.
  layout.tsx         ← metadata, PWA manifest link, basePath-aware icon paths

supabase/migrations/  ← run in order on a fresh project, see §5

scripts/               ← see §8

.github/workflows/deploy.yml  ← the only deploy path. Push to master → builds
                                  with NEXT_PUBLIC_BASE_PATH=/commutation →
                                  publishes to Pages.

SETUP.md   ← step-by-step: how Stage 1 was set up, day-to-day commands,
              the exact WhatsApp message to send the group, troubleshooting
README.md  ← shorter overview, points here and at SETUP.md
```

---

## 8. Scripts — what each one is for, and the traps in them

All read `.env.local`. Run from the repo root.

| Command | Does | Notes |
|---|---|---|
| `npm run dev` | Local dev server | |
| `npm run build` | Production build | Respects `NEXT_PUBLIC_BASE_PATH` if set; unset locally, so local builds serve from `/`. |
| `npm run lint` | ESLint | Should be clean; it was as of this snapshot. |
| `npm run icons` | Regenerates `public/icon-*.png` etc. from an inline SVG | Only needed if the mark changes. |
| `npm run shots` | Screenshots the UI at iPhone size into `.shots/`, via `/preview` (mock data) | Needs `npm run dev` running first. |
| `npm run check` | **13 behavioral assertions against the live database** — cross-user RLS isolation, the inherited-row write scenario, blank-deletes-row behavior. Prints pass/fail only, **never content.** | Briefly claims the real `choolwe` profile *if it's currently unclaimed* to run one check; skips that check gracefully if someone's actively using it. Rate-limited by Supabase's anonymous-signin cap (~30/hr/IP) if run repeatedly in a short window — a burst of failures with "Request rate limit reached" is this, not a regression. |
| `npm run reset` | Hands back every claimed profile, purges test rows, restores default avatars | **Read the warning below before ever editing `TEST_KEYS` in this file.** |
| `npm run e2e` | Playwright walkthrough of the *local* app against the *real* DB: claims a throwaway profile, types, reloads, asserts persistence and that the hub leaks no content, cleans up after itself | Needs `npm run dev` running. |
| `npm run live` | Smoke-tests the **deployed** site: assets load under `/commutation`, Supabase connects, all six names render, stylesheet applied, no failed requests | Use this after every deploy, not just `check`. |

**A destructive bug happened here once — don't reintroduce it.**
`reset.mjs`'s `TEST_KEYS` list (the question ids it's allowed to blank out)
briefly included `"emoji"` and `"arrival"` — **real** survey question ids,
not synthetic ones. Every run of the script silently deleted anyone's actual
answers to those two questions, across every player, whether claimed or not,
with no undo. It ran twice against real data before being caught, and the
deleted answers are gone. Fixed: `TEST_KEYS` now only contains
`__double_underscore__`-wrapped synthetic ids that no real question could
ever collide with. **The rule going forward: never add a real
`survey.ts` question id to any cleanup/purge/test-key list, in this script or
any new one.** If a script needs to write throwaway data for a test, invent
a new id that looks nothing like a real one.

A few one-off diagnostic scripts (`repro.mjs`, `diagnose.mjs`,
`typing-repro.mjs`) were written to chase specific bugs and deleted once the
fix was confirmed. If you see them mentioned in old commit messages but not
in the working tree, that's expected — they were throwaway by design.

---

## 9. Known-fixed bugs, in case any look tempting to "simplify" away

1. **Vercel unreachable from Zambia** → static export + GitHub Pages. Don't
   move back to Vercel without re-testing reachability from the actual
   network the group is on.
2. **`basePath` under GitHub Pages** → `NEXT_PUBLIC_BASE_PATH`, set only in
   the Actions workflow. New absolute asset references need the same prefix
   treatment.
3. **Stranded profiles** (mis-tap, or Safari's 7-day storage eviction) →
   `claim_profile()`/`release_profile()` RPCs, migration `0002`.
4. **Inherited-row write 403** (writing to a `survey_responses` row left by
   a previous session silently failed forever) → `save_answer()` RPC,
   migration `0004`. Client code must call this RPC, never write to
   `survey_responses` directly.
5. **Typing self-destructed while entering "walk-on word"** → `useAnswers.ts`'s
   answer-loading effect depended on the whole `me` object rather than
   `me?.id`. `hype_word`/`trash_talk` fire an optimistic profile update on
   *every keystroke* (unlike other fields, which only autosave after a
   pause), which gave `me` a new object identity each time, which
   re-triggered a full re-fetch of all answers from the server — and
   whichever fetch landed last overwrote whatever had been typed since.
   Fixed by keying the effect on `me?.id`, and by debouncing the
   `hype_word`/`trash_talk` profile-mirror writes (700ms) so they don't fire
   per keystroke at all. If you ever see a field where typing feels laggy or
   loses characters, check whether something in its `onChange` path is
   changing a value that something else's `useEffect` depends on by object
   identity rather than by id.
6. **`reset.mjs` deleting real answers** → see §8. This is the one most
   worth re-reading before touching that file again.

---

## 10. Where things stand right now (this snapshot)

- **Live and verified:** https://choolwec.github.io/commutation/ — `npm run
  live` passes clean.
- **Database:** all 4 migrations applied, anonymous sign-in on, RLS
  verified both ways (cross-user isolation holds; inherited-row writes work).
- **Survey activity:** 3 of 6 have started — Choolwe (5 answers), Niza (34),
  Chibesa (42). Chileleko, Joy, Latasha haven't started. Nobody has hit
  "Seal it" (submitted) yet.
- **`SUPABASE_SERVICE_ROLE_KEY`** is in `.env.local`, verified working,
  not yet used for anything beyond that verification.
- **Stage 2:** built Wed 12 Aug — engine, all 16 games, `/play`, `/tv`,
  Evidence, Awards. Not yet dress-rehearsed on real devices. See §12.
- **`SUPABASE_DB_URL`** is now in `.env.local` too (added Wed 12 Aug, needed
  to run migrations directly — see §12's note on `scripts/migrate.mjs`).
  Same rule as the service-role key: this one, never committed, never a
  GitHub Actions secret.

**Choolwe's outstanding to-dos** (not something to do for him without
asking, but worth surfacing if picking this up mid-week):
- Real venue address, once confirmed — `src/config/event.ts`, plus flip
  `location.pending` to `false`.
- ~~Change `bypassCode` from `"letmein"`~~ — done Wed 12 Aug: it's out of
  the public repo entirely now, living only in the `room_secrets` table
  (§12). A placeholder value was set so the unlock flow has something to
  test against; **change it to something only you know** before Saturday —
  SQL editor: `update room_secrets set value = 'xxx' where key =
  'bypass_code';`. Nobody else who's read this file knows what the
  placeholder currently is.
- Nudge Chileleko, Joy, Latasha — as of Wed 12 Aug they'd caught up
  (39/20/39 answers respectively, all six profiles claimed) — re-verify
  with a fresh count query rather than trusting this.
- **Friday morning, once the survey is actually closed (not before —
  people are still answering as of Wed 12 Aug):** have an isolated
  background subagent (per §2 — never the main conversation thread) go
  through every submitted answer and standardize formatting — consistent
  capitalization, trimmed whitespace, stray punctuation — so what shows up
  in-game Saturday reads cleanly. This is a WRITE to `survey_responses`,
  unlike everything else that pattern has been used for so far (which only
  ever read); treat it with the same caution as `reset.mjs` gets in §8 —
  dry-run it first (report what it *would* change, counts only, before
  touching anything), and don't let it run unsupervised. Requested by
  Choolwe on 12 Aug; deliberately not done yet.

---

## 11. If you're a new session picking this up

1. Read this file, then [PLAN.md](PLAN.md) for the Stage 2 design.
2. Run `npm run live` and `npm run check` — confirms the deploy and the
   database are both still healthy before you change anything.
3. Do a read-only players-table query (see any script in `scripts/` for the
   pattern) to get current survey counts — don't trust the numbers in §10,
   they're a snapshot, not live.
4. Don't run `npm run reset` without checking in first if real answers exist
   — see §8's warning. It's fixed now, but it was destructive once.
5. For any Stage 2 work that needs to read real survey content (tiering,
   interpreting invented rounds), do it via an isolated background
   subagent per §2 — not in the main conversation thread.
6. If Stage 2 exists (check for `src/games/`), also run `npm run
   check:engine` and read §12 before touching any game.

---

## 12. Stage 2 — what actually got built (Wed 12 Aug)

Built in one session, three days out from Saturday: the whole engine, all
16 games, `/play`, `/tv`, Evidence, Awards. Everything below is real and
verified — `npx tsc --noEmit`, `npm run lint`, `npm run build` (static
export, all 10 routes prerender), `npm run check`, and `npm run
check:engine` all pass as of this writing. **What hasn't happened yet: a
real six-tab dress rehearsal, and testing on an actual iPhone.** PLAN.md's
verification checklist for Stage 2 is still the bar to clear before
Saturday — nothing below substitutes for it.

### Schema — migrations 0005 through 0011

Same rule as §5: run in order, don't skip around. Unlike 0001–0004 (pasted
into the SQL editor by hand), these were applied with `node
scripts/migrate.mjs <file>` — a real script, one transaction per file, so a
failure rolls back instead of half-applying like 0003 did. Needs
`SUPABASE_DB_URL` in `.env.local` (see §6). `node scripts/migrate.mjs
--all` runs every migration in the folder in order; safe to re-run, every
statement in every file is idempotent.

| File | What it does |
|---|---|
| `0005_game_engine.sql` | Core tables: `game_room` (one row, singleton), `room_secrets` (RLS on, zero SELECT policies — unreadable through the API by construction), `rounds`, `round_items`, `round_secrets`, `submissions`, `votes`, `scores`, the `leaderboard` view. This is where the privacy shape lives: content and authorship are separate tables with separate RLS, so "who wrote it" is unreadable until a round's `phase` says otherwise — not by convention, by Postgres refusing the query, same discipline as Stage 1's `survey_responses`. |
| `0006_game_rpcs.sql` | Every mutation is a `SECURITY DEFINER` function that checks who's asking before doing anything — no table has an INSERT/UPDATE policy for players directly. `start_round`, `deal_from_survey` (the only thing in the whole system allowed to read `survey_responses.value` — never granted to a client, only callable from inside `start_round`), `set_phase`/`set_cursor`/`set_reveal`, `submit_answer`, `cast_vote`, `score_item`/`score_plurality`, `open_room_if_due`/`unlock_with_code` (the bypass code, checked server-side against `room_secrets`). |
| `0007_decks_and_evidence.sql` | Standalone games that don't need the survey at all: `deal_deck` (host's device supplies content, e.g. Spyfall locations), `deal_roles` (the odd-one-out primitive — Postgres draws who gets the different card, so the drawing device can never be the one who knows), `deal_private`, `award_points`, `start_deck_round`, `score_odd_one_out`. Plus Evidence: `evidence_prompts`/`evidence_photos` tables, `schedule_evidence` (lays out the whole day's random photo prompts in one call), `complete_evidence`, and a public-read `evidence` Storage bucket. |
| `0008_more_primitives.sql` | Three gaps found while actually building the games (see the file's own header for the reasoning): `deal_hidden_answer` (Know Me Best — question public, real answer sealed, which `deal_from_survey` couldn't do because it couples the two), `reveal_item` (Paranoia's coin flip — the only way a privately-dealt card can become public), and `round_events` + `seed_truth_submission` (Buzz In needs "who buzzed first" visible to everyone *instantly*, the opposite of how submissions/votes work; Fibbage/Drawful need a "true answer" option indistinguishable from real submissions, solved by letting a submission have no author). |
| `0009_pass_tokens.sql` | `use_pass()` — the only self-service write against `scores`. Truth or Dare's 2-passes-a-day economy; every other point comes from a host-gated function. |
| `0010_fix_lobby_default.sql` | One-line fix: `rounds.phase` defaulted to `'lobby'`, but none of the 16 games' `start()` functions transition out of it, and `submit_answer`/`cast_vote` only accept `phase in ('play','vote')`. Every round would have rejected its first tap. Changed the column default to `'play'` rather than editing sixteen call sites that were all written assuming a fresh round was immediately playable. |
| `0011_test_mode.sql` | `rounds.is_test`, `deal_test_pair`/`deal_test_hidden` (fake content only, never reads `survey_responses`), `clear_test_rounds`, and a `p_test` param added to `start_round`/`start_deck_round`. Powers `/test` — see its own section below. |

`scripts/check-engine.mjs` is the Stage-2 equivalent of `scripts/check.mjs`
— 17 behavioral assertions, attacks not descriptions (signs in as a
throwaway player and tries to read what it shouldn't), prints pass/fail and
counts only, cleans up its own test rows, never touches the six real
profiles. Run it after touching any migration.

### `/test` — playing games solo before the day (migration 0011)

Choolwe asked to be able to test-play games on his phone before Saturday.
The obvious way (just open `/play` and use the bypass code) has two real
problems: it permanently sets `unlocked_at` for **everyone**, days early,
with no way to undo it — and five games read real sealed survey content in
their normal `start()`, so "just testing" would mean a real confession
getting read before the day, which is exactly the thing §2 promises never
happens, Choolwe included.

`/test` (linked from the hub, visible only when `me.id === 'choolwe'`)
solves both: it skips the unlock gate entirely without ever touching
`unlocked_at`, and every round it starts is tagged `is_test = true`
(`rounds.is_test`, migration 0011). `who_wrote_it`, `know_me_best`,
`the_deep_end`, `most_likely_to` and `best_answer` each ship a `startTest`
on their `GameModule` that deals obviously-fake content via
`deal_test_pair`/`deal_test_hidden` instead of running their real
survey-reading `start()` — those two new RPCs never read
`survey_responses`, which is the actual safety property, not a convention.
Every other game just reuses its real `start()` with `p_test: true`
injected, since those never touched real content to begin with. A "Clear
all test data" button calls `clear_test_rounds()`, which cascades away
everything a test round touched — items, secrets, submissions, votes, and
critically the points it awarded, so test play can never leak into the
real Saturday leaderboard.

**Extending this:** any new game whose `start()` reads `survey_responses`
needs a matching `startTest`. Anything that only uses `deal_deck`/
`deal_roles`/`deal_private` doesn't — those never touched real content
either.

### The 16 games

Built across two parallel background sessions plus the main thread, each
briefed with the same contract (`src/lib/game/types.ts`'s `GameModule`) and
told independently to give their games a distinct visual identity rather
than sharing one generic template — Choolwe was explicit that games which
all look the same don't get played. Registered in `src/games/registry.ts`.

- **🔒 Vault** (sealed until unlock, runs on real survey answers): Who Wrote
  It?, Know Me Best, Paranoia, The Deep End, Truth or Dare.
- **📱 Huddle** (phone-only, no TV needed): Most Likely To, Spyfall, The
  Chameleon, Hot Takes, Never Have I Ever, Mafia.
- **📺 Arena** (TV-first, greyed out in the launcher until `/tv` is open on
  a laptop): Drawful, Fibbage, Best Answer, Buzz In (Trivia), Buzz In (Name
  That Tune).

Every game follows the same shape: `start()` deals the round via RPCs
(never reads sealed content itself — that's Postgres's job), `PhoneView`
renders off `useRoom()`. Adding a 17th game is a new folder plus one line
in the registry, same as the original design intended.

### Known simplifications — real, not hidden

Time-boxed decisions, worth revisiting if there's slack before Saturday:

- **No bespoke `TvView` for any Arena game yet.** `/tv` falls back to a
  generic board (the round's public content + the live leaderboard) for
  anything without one. Every Arena game is fully playable phone-only right
  now — the TV adds a shared display, not a requirement — but the "TV is
  the stage" spectacle PLAN.md described for Drawful/Fibbage/Buzz In isn't
  built yet.
- **Deck answer keys ship in the JS bundle** (Fibbage's facts, Trivia's
  answers) — a determined cheater could read them in devtools. Same trust
  level as a board game's answer booklet in the box; not worth a server
  round-trip for six people who know each other. The one place this was
  worth fixing properly: Fibbage's actual answer is sealed server-side via
  `seed_truth_submission`, same mechanism Drawful reuses.
- **Mafia's "who's still alive" is tracked in the host's own local React
  state**, not the database. A live game of Mafia is always run by a
  moderator narrating out loud anyway; this just gives them a private
  ballot box, same division of labor as the real thing. Nobody's phone
  hard-blocks a dead player from voting — the host self-polices it.
- **Truth or Dare's pass counter is a static line**, not a live "you have 1
  left" — `useRoom()` doesn't expose raw `scores`, and extending it wasn't
  worth the scope for a display-only counter.
- **Name That Tune needs internet at play time.** Clips stream live from
  Apple's iTunes preview API (see `src/config/name-that-tune.ts` for why —
  short version: committing real song files to this public repo, even
  temporarily, is real copyright distribution, so nothing is hosted here).
  Confirmed CORS-open and working as of Wed 12 Aug; if it ever isn't, Buzz
  In: Trivia doesn't depend on it and still works.
- **`docs/THEIR_ROUNDS.md` has a full buildable spec for the group's 12
  invented rounds** (section 7 of the survey) — sorted by a subagent that
  never let the raw text reach this conversation, per §2. Two turned out to
  be existing named games ("Contact", a letter-reveal word game; and a
  30-Seconds-style rapid question circle), one was recognisably Mafia and
  got skipped per Choolwe's own rule (Mafia got built as its own game
  instead, from a direct request, not from that submission). **None of
  these are wired into the registry yet** — the spec is ready, the modules
  aren't built. This is the highest-value remaining work if there's time
  before Friday.

### Before Saturday

1. Real dress rehearsal — PLAN.md's checklist: six browser tabs plus a TV
   tab playing one round of everything, then the same on a real iPhone
   (lock/unlock mid-round, two minutes untouched to confirm no wake-lock
   regression — the wake lock itself was never built this session, worth
   checking it's still on the list).
2. Change the bypass code (§10's to-do list, above).
3. Build from `docs/THEIR_ROUNDS.md` if there's time.
4. Consider at least one bespoke `TvView` — Drawful is the highest-value
   candidate, it's the game that most needs the shared screen.
5. Set the unlock a few minutes ahead once, watch `/play` and `/tv` both
   transition live, then reset `EVENT.unlocksAt` back to 13:00 Saturday.

---

## 13. Overnight polish — night of 13→14 Aug 2026

An autonomous session, briefed by `docs/AUTOMODE_BRIEF.md` (kept in the repo
as the record of what was asked for and already-decided going in). Worked on
branch `overnight-polish`, never `master` — nothing here is live. Read that
file first if you want the original punch list this section reports against.

**First thing found, before any of the punch list:** all of Stage 2 (§12 —
the whole engine, all 16 games, everything) was sitting **uncommitted** on
`master`'s working tree, alongside several tracked-file edits. That's real,
already-verified work from Wed 12 Aug that had just never been committed.
Moved it onto `overnight-polish` and committed it in ~7 logical chunks
before touching anything new, so it can't be lost to a stray `git clean` or
`checkout` by a future session. If you're reading this and wondering why
the branch's early history looks like a second "Stage 2" build — that's
why; it's the same Wed-12-Aug work, just finally committed.

### P0 — all four fixed and verified

- **Truth or Dare's Pass now actually passes.** New migration `0012`:
  `pass_and_advance()`, a self-service RPC that does what `use_pass()`
  (0009) did — deduct 25 points, cap 2/day — *and* advances/finishes the
  round itself, scoped to `truth_or_dare` rounds only so it can't become a
  general non-host round-advance backdoor. `use_pass()` itself is untouched
  and unused now (harmless to leave; migrations aren't edited after the
  fact, see §5/§9's own rules).
- **Know Me Best: the subject can now see the reveal.** The bug was
  `isSubject` being checked before `revealed` — one-line fix. On top of
  that, per the brief's nice-to-have: the subject can now award their own
  closest-guess (`award_closest_guess`, migration `0013`, checks caller =
  `rounds.subject` rather than `assert_host()`), with the host's
  `award_points` path left intact as a fallback.
- **Paranoia's coin flip is synced across every phone.** Was local
  `useState` on whichever device tapped the button. Now broadcasts a
  `round_events` row (`kind: 'coin_flip'`) — the same "everyone needs this
  the instant it happens" primitive Buzz In already used for who-buzzed-
  first, no new RPC needed. Every phone derives its own flip animation from
  the same broadcast row, timed against the event's server timestamp (same
  reasoning `RoundTimer.tsx` already uses `round.started_at` over a local
  clock).
- **Screen Wake Lock is in.** New `useWakeLock()` hook
  (`src/lib/useWakeLock.ts`), wired into `PlayGate` (whole time the room's
  unlocked) and `TestRoom` (solo dress rehearsal). Re-acquires on
  `visibilitychange` since the lock silently releases when a tab
  backgrounds. Silently a no-op where unsupported/denied.

### P1 — rules affordance, one file reaching all 16 games

New `src/games/rules.ts` (plain data, zero imports from any game folder —
importing the registry from `GameShell.tsx` would be circular) plus a
rewritten `GameShell.tsx`: a "?" in the header opens a bottom-sheet with
2-4 plain-English lines per game (what you'll see, what you do, how it's
scored), and it auto-opens once per game per browser session
(`sessionStorage`), reachable any time afterward. Spyfall's entry opens by
naming "Skyfall" directly, since that's what Choolwe calls it in his head.
Fibbage/Best Answer/The Deep End/Hot Takes get the specific mechanics the
brief called out; the other 11 written from each game's own header comment
and its actual scoring RPCs, not guessed.

**A real bug surfaced by screenshotting this, not by typechecking:** the
rules sheet is `position: fixed`, and it used to render *inside*
`GameShell`'s `<header>`, which carries a `rise` entrance animation. For
the ~0.5s that animation is playing, `header`'s computed `transform` isn't
`none`, which makes it a CSS containing block for any `position: fixed`
descendant — so the sheet rendered pinned to the animating header's box
instead of the viewport, squashed against the top of the screen. This
happened on literally every first-mount, since that's exactly when both
the header animation *and* the rules sheet's auto-open fire together.
Fixed by lifting the sheet to render as `header`'s sibling instead of its
descendant. Would not have been caught without actually looking at a
screenshot — see the verification note below.

### P2

- **Chameleon**, three concrete additions, not just copy: a shared 90s
  countdown during "say one word each" (`RoundTimer`, auto-advances to
  voting on expiry — needed a one-line supporting fix, `start()` now calls
  `set_phase(..., 'play')` so `round.started_at` actually gets set, since
  nothing else does on a fresh round); a caught Chameleon's one guess at
  the secret word for partial credit, straight from the real board game
  (`award_chameleon_guess`, migration `0014` — recomputes "caught"
  server-side rather than trusting a client flag, so an actual survivor
  can't also farm the partial-credit points); and sharper round copy on
  what makes a clue too obvious vs. too vague, with a worked example.
- **Never Have I Ever stays deliberately unscored** — a decision, not a
  gap, now documented in the file's own header comment. Attaching points
  to "I have" would incentivize downplaying real answers to protect a
  score, which cuts against the point of the game. A "room can challenge
  an answer" mechanic was considered and skipped for the same reason.

### Content register — loosened, as already decided going in

`AUTOMODE_BRIEF.md` §1 records the decision Choolwe made before this
session started (content intensity loosened from `decks.ts`'s original
"sexual is not the register" line — bolder, flirtier, more romantically
pointed; hard ceiling unchanged: no dare involves kissing, touching, or
anything physically/sexually intimate, nothing explicit, no alcohol,
ever). Implemented: `TRUTHS`/`DARES` rewritten and grown from 5 to 8 items
per tier, `NEVER_HAVE_I_EVER` from 10 to 12, and `decks.ts`'s header
comment updated to state the real boundary instead of the stale original
line. Every dare stays verbal/phone/performance-only — the same shape the
original deck already used, just re-threaded through a romantic angle
instead of a generic one.

### P3 — Launcher rebuilt, GameShell polished, both actually screenshotted

- **Bottom tab bar** (Huddle / Arena / Vault / Board) replaces the single
  scrolling host-only list and the bare "waiting on the host" screen.
  Everyone can now browse all three halls and the leaderboard; only the
  host can launch (still enforced server-side, `assert_host()`, unchanged)
  — non-host tiles render fully, just disabled, with a small explanatory
  note. **One deviation from the brief's rough sketch, as it invited:** it
  floated a "Vault sealed until unlock" tab state, but that state doesn't
  exist in this engine — unlock is one global flag on `game_room`, not
  per-hall, and `PlayGate` already blocks the whole Launcher from
  rendering until the day's unlocked. By the time anyone sees the tab bar,
  Vault is exactly as open as Huddle, so it gets identical treatment.
- **Bespoke tile art**, new `src/games/tileArt.tsx`: every game's own
  documented "VISUAL IDENTITY" (gold case-file for Know Me Best, dark
  spotlight for Paranoia, Drawful's orange, Fibbage's gold, etc.) now
  reaches the picker as a distinct accent color plus a small inline-SVG
  motif per game (redacted document lines for Who Wrote It?, a coin
  edge-on for Paranoia, a crescent moon for Mafia, a vinyl record's
  grooves for Buzz In: Name That Tune...). Inline SVG, not raster/AI art,
  per the brief — stays light on a static export.
- **GameShell header typography fixed for real.** Hub.tsx's own
  convention pairs a small eyebrow with a bold `text-lg` headline
  underneath; GameShell had the game's actual title rendered *as* the tiny
  muted eyebrow, with no headline anywhere on the screen a player spends
  the whole round looking at. Flipped. Also bumped the "?" button to a
  proper ~28px tap target and the progress bar for visibility across a
  room.
- **Verification tooling extended, not just used:** `/preview` only ever
  mocked `PlayerContext` (Stage 1). Exported `RoomContext` (was
  module-private) and added a "play" view (Launcher, with host/guest and
  TV-connected toggles) and a "game" view (a mid-round Truth or Dare) to
  `/preview`, and folded both into `npm run shots` permanently — future
  sessions get Stage 2 screenshot coverage for free, not just Stage 1's.
  This is what actually caught the containing-block bug above; typecheck
  and lint were clean the whole time it was broken.

### New migrations this session: 0012–0014

All applied via `node scripts/migrate.mjs`, all verified with throwaway
attack-style scripts modeled on `scripts/check-engine.mjs` (claim a
throwaway player, try the thing, assert the DB's behavior, clean up in a
`finally` — never touching the six real profiles) — written, run, and
**deleted** once green, per §8's own "repro.mjs" convention. Re-ran
`npm run check:engine` (all 18 checks) after each one.

| File | RPC | What it protects |
|---|---|---|
| `0012_pass_and_advance.sql` | `pass_and_advance` | Self-service pass that actually advances the shared round; scoped to `truth_or_dare` |
| `0013_award_closest_guess.sql` | `award_closest_guess` | Lets the round's subject (not just the host) award Know Me Best's 100; scoped to `know_me_best` and `caller = rounds.subject` |
| `0014_chameleon_partial_credit.sql` | `award_chameleon_guess` | Caught Chameleon's one guess for partial credit; recomputes "caught" server-side so a survivor can't double-dip |

### Verified, and how

`npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run
check:engine` all pass clean as of the tip of `overnight-polish`. Every
new RPC got a real behavioral test (not just "it compiled") via a
throwaway script, deleted after. The Launcher/tile-art/GameShell work got
actually screenshotted via the extended `/preview` + `npm run shots` (see
above) and looked at — host view, guest view, TV-blocked Arena, the
leaderboard tab, a live game screen, and the rules-sheet auto-open moment.

**Not live-browser-verified:** the real `choolwe` profile was claimed by
an active session for the whole night (checked before attempting anything
that would've needed it) — matching `check.mjs`'s own documented
precedent of skipping rather than forcing a takeover, nothing here ever
claimed it or touched `unlocked_at`/`EVENT.unlocksAt`/the real bypass
code. Worth a real `/test` click-through in the morning on all 16 games,
same as PLAN.md's dress-rehearsal checklist already called for.

**One cosmetic, dev-only artifact, not a bug:** screenshots taken via
`npm run dev` show a small black "N" badge in the bottom-left corner —
that's Next.js's own dev-mode indicator overlapping the tab bar's Huddle
label. It doesn't exist in a production/static-export build; not worth
touching `next.config.ts` for.

### Deliberately not done

- **P4 (`docs/THEIR_ROUNDS.md`'s 12 invented rounds)** — explicitly told
  not to let this compete with P0-P3 for time tonight, and it didn't. The
  spec is real and ready; still nothing wired into the registry.
- **Real six-tab dress rehearsal**, on real iPhones, per PLAN.md's
  checklist — still the bar to clear before Saturday, nothing tonight
  substitutes for it.
- **Bypass code** — still the placeholder from Wed 12 Aug (§10's
  outstanding to-do). Nobody who's read this file knows what it currently
  is; change it before Saturday.
- **Real venue address** — still pending in `src/config/event.ts`.

### Where things stand (fresh counts, read-only, never content)

All six profiles claimed. Answer counts as of this session:
Choolwe 39, Chileleko 20, Joy 7 (submitted), Latasha 39, Niza 65
(submitted), Chibesa 47 (submitted). Three of six haven't hit "Seal it"
yet. `game_room`: `host_player = 'choolwe'`, `unlocked_at = null`,
`active_round = null` — the real Vault is untouched and still locked, as
it should be until Saturday.
