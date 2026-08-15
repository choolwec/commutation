# HANDOFF — read this first

For a fresh Claude session picking up this project with zero prior context.
Read this whole file before touching anything — several mistakes were made
and fixed along the way, and the fixes only hold if you don't undo them
without knowing why they're there.

**Snapshot taken:** Sun 9 Aug 2026, evening; **updated Wed 12 Aug 2026** when
Stage 2 was built (see §12); **updated again night of 13→14 Aug 2026** for an
overnight autonomous polish pass (see §13); **updated again 14 Aug 2026** when
the group's own twelve invented rounds were finally built (see §14 — the game
count is now **25**, not 16); **updated again 14 Aug 2026, later the same day**
for the art pass (see §16 — Drawful also got its bespoke `TvView`, closing an
item §12/§13 had both flagged as outstanding); **updated again night of
14→15 Aug 2026** for a second overnight polish pass (see §17 — nine more
bespoke TvViews, four real gameplay bugs found and fixed across six commits
— Mafia's night-vote mechanic was completely unplayable, in two parts, the
second only surfacing on re-verification; **Drawful's drawing canvas was
completely unreachable for every artist, on every turn — the whole game was
unplayable, not just its turn counter, which is the part an earlier fix
that same night had already (incompletely) addressed** — and the app's
first sound effects). If it's later than that, treat anything time-sensitive
below (survey counts, "not yet built") as stale and re-verify rather than
trust it.

---

## 1. What this is

**Commutation** — a two-stage web app for a hang with 6 people (Choolwe,
Chileleko, Joy, Latasha, Niza, Chibesa — 2 guys, 4 girls, platonic, no
drinking) on **Saturday 15 Aug 2026, 13:00–20:00**.

- **Stage 1** (info hub + a private, sealed survey) — **built, live, verified.**
- **Stage 2** (a synced multiplayer game console that unlocks automatically
  at 13:00 Saturday) — **built, 25 games, not yet dress-rehearsed.** Full
  original design in [PLAN.md](PLAN.md); what actually got built, and where
  it diverges, is §12 (the first 16) and §14 (the nine the group invented
  themselves, from [THEIR_ROUNDS.md](THEIR_ROUNDS.md)).

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

---

## 14. Their rounds — the group's own twelve, built (14 Aug 2026)

The work §13 explicitly deferred as "P4": turning
[THEIR_ROUNDS.md](THEIR_ROUNDS.md) — survey section 7's twelve "invent a
round" answers, spec'd by an isolated subagent per §2 — into real games.
**Nine new `GameModule`s, taking the app from 16 games to 25.** Same branch
(`overnight-polish`), still nothing on `master`.

Read THEIR_ROUNDS.md first if you're picking this up: it's the spec these were
built against and it records every resolution Choolwe made on 12 Aug. It now
carries a STATUS banner pointing back here.

### What shipped

| Spec | Game | Hall | The mechanic in one line |
|---|---|---|---|
| §1.1 | **Act It Out** | huddle | Charades, except ~2 cards in 5 come up OPPOSITE DAY and you act the inverse of your word |
| §1.2 | **Spell It Out** | huddle | A spelling bee with no turns and no elimination — one reader, everyone spells at once |
| §1.3 | **Survey Says** | huddle | Six-person Family Feud: you score by matching other people in the room, not by being right |
| §2.3 | **Contact** | huddle | Letter-by-letter reveal, clue someone into the word, holder can block |
| §2.5 | **30 Seconds** | huddle | Five words, half a minute, can't say any of them |
| §3.1 | **Speed Cards** | huddle | Physical deck; the app is a clock, a house twist and a ledger |
| §3.2 | **Clap Circle** | huddle | One clap passes, two reverses, three skips; miss yours and you're out |
| §3.3 | **Centre Stage** | huddle | Everyone performs once, everyone rates 1-5, ratings shown per rater |
| §3.4 | **Question Volley** | huddle | Never answer — ask the next person instead, three seconds or you're caught |
| §2.1 | *(not a new game)* | vault | A **forfeit** is now the last card of every Truth or Dare deck |

All nine carry `origin: "group"` on their module, which is the only thing the
Launcher groups on — they render under a **"🧠 Your Rounds"** heading inside
the Huddle tab, so on the day the room can see that a third of the schedule
came out of their own answers. Whose idea each one was stays sealed; that
reveal is the payoff, per THEIR_ROUNDS' own header.

**Not built, deliberately, both because the spec said not to:** §2.4 (the
secret-role elimination idea — it's Mafia by name with no distinguishing
twist, and Mafia already shipped from a direct request) and §3.5 (the
unidentified playground game — run it verbally). §2.2's audio round needed
nothing: Buzz In: Name That Tune already covers it, and it already streams
from iTunes rather than committing copyrighted clips to this public repo,
which is exactly the fallback §4.1 recommended.

### New migrations: 0015 and 0016

Applied with `node scripts/migrate.mjs`, verified with throwaway attack-style
scripts (deleted once green, per §8's convention), and `npm run check:engine`
re-run after each.

| File | What it adds |
|---|---|
| `0015_their_rounds_primitives.sql` | `normalise_answer` (one shared definition of "same answer"), `score_exact` (pays everyone who typed the sealed answer), `score_agreement` (§1.3 asked for this by name — pays 100 × (group size − 1)), `deal_private_answers` (an accept-list, so a synonym doesn't cost a point), `set_round_config` (host-only shallow merge into `rounds.config`) |
| `0016_forfeits_and_contact.sql` | `deal_forfeit` / `reroll_forfeit` (§2.1), `contact_reveal_letter` (§2.3) |

`ContentSource` gained a fifth variant, `{ kind: "private" }`, exactly as
THEIR_ROUNDS §0 asked.

### Two judgement calls worth knowing about

**§2.1's eligibility filter could not be built as specified.** The spec wanted
`deal_forfeit()` to read an eligibility attribute "from sealed survey data
inside the definer function" so a forfeit that doesn't fit its target is never
dealt. There is no such data: `src/config/survey.ts` has no question about
relationship status, siblings or living parents, and three of the six had
already sealed their survey, so adding one wasn't available either.

The requirement was kept and the check moved to the only place the answer
exists — the recipient's own head. Every forfeit carries a `needs` line shown
to the one phone it was dealt to, and that phone can swap it for another
(`reroll_forfeit`) with **no public trace at all**: no event, no score, no
config write, so a re-roll is indistinguishable from having been dealt that
card in the first place. That beats the alternative the spec itself warned
against — a public column on `players` would broadcast a private fact to the
whole room. Which *person* gets it is still drawn by Postgres, as specified.
Full reasoning is in `0016`'s header; read it before changing this.

**A real bug found while verifying, unrelated to P4 but far more serious.**
`src/lib/useNow.ts` passed `() => Date.now()` as `useSyncExternalStore`'s
getSnapshot. React compares snapshots with `Object.is` on every render to
decide whether to re-render, so a fresh number every call reports "changed"
every time — an unbounded render loop ending in *"Maximum update depth
exceeded"*. Its only caller is `RoomProvider`, which every phone in `/play`
and `/tv` sits inside all day. **This would have taken the whole game console
down on Saturday.**

It survived §13's screenshot pass because `/preview` — and therefore
`npm run shots` — mocks `RoomContext` directly instead of mounting
`RoomProvider`. The one screen in the app that never renders that hook is the
screen the UI was being reviewed on. Fixed by reading the clock only on the
interval tick, into a ref. The lesson is in the file's own comment: `/preview`
is not a substitute for loading a real page.

### Getting out of a round

An active round used to be a trap — `PlayRoom` renders the round instead of
the picker for everybody, and the only way back was the host clicking through
to the end of whatever was running. `GameShell` now carries a **✕** next to
the "?", which reaches all 25 games at once:

- **"Back to the games list"** — local to one phone, via the new
  `ExitContext` (`src/components/play/ExitContext.tsx`). The round carries on
  for everyone else, and a "still going" bar above the tab bar rejoins in one
  tap. The left-round is stored as an id, not a boolean, so starting the next
  game automatically pulls everyone back in.
- **"End this round for everyone"** — host only, two taps to confirm. Just
  `set_phase(done)`, which was already `assert_host()`-gated.

`/test` has the same escape hatch and its own rejoin bar.

### Rules sheet, changed

- **Once per device, ever, not once per tab session.** It was keyed on
  `sessionStorage`, which Safari resets when a tab closes or gets evicted —
  across a seven-hour day that means the sheet reappearing in front of games
  people already know. Now `localStorage`, wrapped in try/catch for
  private-mode Safari.
- **Three ways out, and it can't trap you.** A ✕ in the corner (44px, always
  visible), "Got it" pinned to the bottom, the backdrop, and Escape. The sheet
  is now a flex column capped at `85dvh` with the rules scrolling between a
  fixed header and footer — without that, a four-line entry (Contact,
  Spyfall, 30 Seconds) grew past the bottom of a small iPhone and pushed "Got
  it" off-screen with nothing to scroll.

### Verified, and how

`npx tsc --noEmit`, `npm run lint`, `npm run build` (all 11 routes prerender)
and `npm run check:engine` (18 checks) pass clean at the tip.

More usefully: a throwaway Playwright script drove **every one of the ten
touched games through the real `/test` flow in a real browser** — each
module's actual `start()` against the actual database, asserting the round was
created, tagged `is_test`, dealt the right number of item slots, dealt the
right ones privately, and threw nothing in the browser. It also checked the
rules-sheet contract and the whole leave / rejoin / end-round flow. Same
throwaway-seventh-profile pattern `check-engine.mjs` uses, restoring
`game_room` exactly and never touching the six real profiles or `unlocked_at`.
Deleted once green — but it's the single highest-value thing to rebuild if a
future session adds a game, because it is what caught the `useNow` loop.

`npm run shots` gained three permanent shots — the "Your Rounds" section of
the picker, a mid-round Clap Circle (the seat ring is the widest new layout
and the likeliest to break at 393px), and the exit sheet.

### Still open

- **Real six-tab dress rehearsal on real iPhones** — still the bar, still not
  done. It matters more now at 25 games than it did at 16.
- **Content decks are hand-written and unplayed.** `src/config/their-rounds.ts`
  holds all of it. Worth a skim before Saturday, particularly `FORFEITS` —
  every one of those cards asks somebody to ring a real person.
- **Real venue address** still pending, from §13.
- ~~**Bypass code**~~ — set by Choolwe directly on 13 Aug, no longer the
  Wed-12-Aug placeholder. Not written here, per its own rule (§6).

---

## 15. Standing rule — every full-screen page needs a way back (13 Aug 2026)

Found right after §14 shipped: clicking the new Hub card into `/play`, or
either of the new `/awards` / `/recap` links, was a one-way trip. Once
Choolwe pointed it out for the Vault card specifically, the same check
across the rest of the app found the identical gap on `/awards`, `/recap`,
`/test`, and `ClaimScreen` (which any of those routes can land on too, if
nobody's claimed a profile yet on that device — it isn't only reached from
`/`).

**Why this matters more here than on a normal website:** the app is meant to
be added to an iPhone home screen and run standalone. No browser chrome, no
address bar, no swipe-back gesture. Once a page fills the screen, whatever
that page itself provides to get out is the *only* way out. A missing back
link isn't a papercut on this app the way it would be on a page with a
browser's own back button sitting right there — it's a dead end.

**The rule, going forward:** every full-screen top-level view (every route
under `src/app/*/page.tsx`, and every state `Gate` can render on its own)
must render `src/components/BackToHub.tsx`, or reach one within a tap or two
through something that already has an exit. Concretely:

- `PlayGate`'s locked/countdown screen, `Launcher`, `TestRoom`, `ClaimScreen`,
  `Awards`, `RecapGallery` — all render it directly now.
- Deep inside a live round, `GameShell`'s own ✕ ("leave this round", §14)
  satisfies the rule *transitively*: round → picker (which renders
  `BackToHub`) → hub. That's deliberate — 25 games each carrying their own
  redundant hub link would be worse than the one-hop chain.
- **The one documented exception is `/tv`.** It's a fixed display meant to
  sit on a laptop all day with nobody navigating it by hand; a stray "back"
  tap there would yank the shared screen away from a live round for the
  whole room. Don't add one there without a real reason.

`BackToHub` takes an `absolute` prop for screens with no header row of their
own (`PlayGate`, `ClaimScreen`) and renders inline otherwise (`Launcher`,
`TestRoom`, `Awards`, `RecapGallery`). Read its own file header before adding
a new full-screen route — it explains the two placement patterns and why
`ClaimScreen` always shows it even on `/` itself (harmless no-op there;
without it, it's a real dead end reached from anywhere else).

Verified with `npx tsc --noEmit` and a visual check via `/preview` (the
`claim` and `play` views both show it correctly at iPhone width) before
pushing straight to `master` — small, additive, no schema or logic changes.

---

## 16. The art pass, and a bespoke Drawful `TvView` (14 Aug 2026)

Two unrelated things landed in this session, in two separate commits
straight to `master` (`ccdd62b` then `ae52382`) — additive, no schema
changes, same precedent as §15.

### Drawful finally has a bespoke `TvView` (`ccdd62b`)

This was found sitting **uncommitted** on `master`'s working tree at the
start of the session — same situation §13 opened with for all of Stage 2,
just smaller. `src/games/arena/drawful/TvView.tsx` (`DrawfulTv`), wired into
`drawful`'s `GameModule`, plus `/preview` gained a `"tv"` view (mock
round/items/submissions/votes/secrets for all three phases) and `npm run
shots` gained a laptop-width screenshot pass for it. This closes the item
§12's "Known simplifications" and §13's "Before Saturday" §4 both flagged:
"no bespoke TvView for any Arena game yet ... Drawful is the highest-value
candidate." The other Arena games still fall back to the generic board.

### The art pass (`ae52382`)

Choolwe generated 8 pieces of AI hero/mood art on davinci.ai and asked for
them wired in. `docs/ART.md` — the brief he was working from — went through
two real revisions in this same session before any of these 8 were
generated, both worth knowing about if it's ever edited again:

1. **First pass fixed an "everything has eyes" bug.** The original 20-item
   brief's shared style block told the model every object gets "simple
   cartoon eyes and sometimes small white-gloved hands" — a blanket rule
   that was leaking onto props that were never meant to have a face (dice,
   spotlights, wheels). Rewritten so personality is opt-in per scene, named
   explicitly only on the handful of pieces meant to have it.
2. **Second pass was a full pivot, after seeing the actual output.** The
   "1930s rubber-hose Fleischer/Disney" style wording wasn't describing
   *linework* to the model — it was generating literal Cuphead, gloves and
   all, no matter how the prompt insisted "not its characters." That phrase
   is too fused to one specific IP in training data to fight with wording;
   the fix was dropping the reference entirely, not a better sentence. New
   style is written from scratch (a screenprinted jazz-club/stage-magic
   poster, no franchise named anywhere) and — this was the other real find —
   targets the app's actual dark theme. The original brief said "warm cream
   base palette"; the app is `--color-ink: #08070c` with a CSS grain overlay
   on every page (`globals.css`'s `.grain::before`, applied in
   `layout.tsx`). Nobody had checked that before this session. The new
   prompts target near-black backgrounds and explicitly tell the model not
   to render grain/vignette/halftone into the image, since the app already
   layers that in CSS and fighting it was wasted prompt weight.

Cut from 20 pieces to 8 at the same time: every game already has bespoke
flat-SVG key art in `src/games/tileArt.tsx` (§13's P3), so most of the
original list was duplicating work that already shipped for free. What's
left is the atmosphere SVG can't do — `hub-hero`, `awards-hero`, the three
hall banners (`hall-vault`/`hall-huddle`/`hall-arena`), and hero pieces for
the three highest-value games (`game-drawful`, `game-truth-or-dare`,
`game-clap-circle`). All 8 were generated once against the pivoted brief,
reviewed by hand (no character/eye bleed on any of them), and committed —
the 20-item list never got generated against. The app icon was deliberately
left off this list too: it's better served by the existing hand-built
generator (`npm run icons`, `scripts/make-icons.mjs` — a gradient-ring SVG
mark already in `public/`) than a raster generation gambled on surviving a
shrink to fingertip size. No action was needed there; it already exists.

**Pipeline:** raw downloads live in `art/` (~14MB of PNGs, committed as a
source-of-truth staging folder, see `art/README.md`). New `npm run art`
(`scripts/resize-art.mjs`, same sharp-based pattern as `make-icons.mjs`)
resizes and re-encodes them as webp into `public/art/` — ~800KB total,
served by the app. Re-run it any time a file in `art/` changes.

**Wired in:**
- `hub-hero` and `awards-hero` — banners atop `Hub.tsx` and `Awards.tsx`.
- `hall-vault`/`hall-huddle`/`hall-arena` — banner the matching tab inside
  `Launcher.tsx`'s `HallSection`.
- `game-drawful`/`game-truth-or-dare`/`game-clap-circle` — a new hero-intro
  beat in `GameShell.tsx` (`HERO_INTRO` map), full-bleed over the whole
  screen with the game's icon/title, for these 3 games only. Auto-dismisses
  after 1.8s or on tap. Tracked by `round.id` rather than a mount-once flag,
  since a game's `PhoneView`/`GameShell` instance doesn't necessarily
  remount between two different rounds of the same game — this way a
  replayed round still gets its beat. It re-plays if a phone leaves and
  rejoins a round via the "still going" bar (§14) too, since that fully
  unmounts `GameShell`; decided not worth guarding against for a ~2-second
  cosmetic beat.

One cosmetic asset quirk, harmless: `hall-vault.png` generated at a 3:4
portrait crop despite the square prompt — doesn't matter, every placement
uses `object-cover` inside a fixed-height container regardless of source
aspect.

**Verified:** `npx tsc --noEmit`, `npm run lint` (clean beyond the
pre-existing repo-wide `no-img-element` warnings — this codebase uses plain
`<img>` everywhere on purpose, `next.config.ts`'s own comment says so, static
export can't run the image optimizer), `npm run build` (all 11 routes still
prerender, all 8 webp files land in `out/art/`). Actually looked at, not
just typechecked: a throwaway Playwright pass against `/preview` screenshotted
the hub hero, all three hall banners, and the Truth or Dare / Clap Circle
intro beats mid-display and after auto-dismiss — confirmed the beat correctly
gives way to the real round content (and, for Clap Circle's first-ever
"play", to the rules sheet underneath it) rather than the two overlays
fighting for the same `z-50` layer.

### Still open

- Same items §14 already listed, unaffected by this: **real six-tab dress
  rehearsal on real iPhones**, and a skim of `their-rounds.ts`'s forfeit
  cards. Neither touched this session.
- The other 22 games still use only their `tileArt.tsx` SVG motif, no photo
  key art — deliberate, per the "already covered" reasoning above, not a
  gap to fill later unless the brief changes.

---

## 17. Overnight polish, part two — night of 14→15 Aug 2026, briefed by `docs/POLISH_BRIEF.md`

A second autonomous pass, same branch discipline as before except this time
**straight to `master`** (Choolwe's explicit call for tonight, recorded in
`docs/POLISH_BRIEF.md` §8 — progressive deploy, verify-then-push per change,
auto-revert if the live site ever breaks). `docs/POLISH_BRIEF.md` is the
brief this section reports against; it's kept in the repo as the record of
what was asked for, same convention as `docs/AUTOMODE_BRIEF.md` before it.

**First thing found, before any of the brief's own punch list:** ten commits
(`6180e41`..`b83f303`, 01:54–02:47 this same night) were already on `master`,
deployed, and green, but never written up here — a bespoke `TvView` for
Best Answer, The Chameleon, Survey Says, Who Wrote It?, Paranoia, Fibbage,
and Centre Stage, plus a real board for both Buzz In variants, `TvShell.tsx`
factored out as the shared frame those all build on, and a fix to
`check.mjs` releasing a profile it never claimed. That work is real,
already verified (`gh run watch` + `npm run live` after each push), and is
folded into this section rather than getting its own — it's the same
overnight session, just a context handoff partway through. One of those
nine is worth flagging on its own: **Buzz In: Trivia's old generic-fallback
board was dumping the whole `round_item` straight onto the TV — for a
trivia question, that's the answer index in plain JSON, readable by anyone
glancing at the screen before the host ruled.** Fixed the same night, before
this section's own bug hunt started; mentioned here because it's the same
bug *class* (§5 below) as two of the ones this pass found on its own.

At this point, 10 of the app's TvViews are bespoke (Drawful from §16, plus
these 9); the other 15 games still fall back to `TvRoom.tsx`'s generic
board, which is deliberately built to never sit blank (accent color, tile
motif, `round_events`-driven "who just did something" flash, a live clock)
rather than a gap.

### Stream one — the bug hunt (§5 of the brief), and what it actually found

The brief was explicit that this is the highest-value stream, and it
proved out: **four real, previously-unknown bugs across four games**, one
of them (Mafia) with a second part that only surfaced on re-verification,
and another (Drawful) that turned out to have a *second, more severe* bug
hiding behind the first — six fixes in total. Three of the four incidents
were severe enough that they would have surfaced live on Saturday, not in
a screenshot; one of those (Drawful) would have made an entire game
completely unplayable. All were found by actually clicking through a full
round in a real browser, several only after deliberately forcing a
throwaway test account into the specific seat (subject, artist, mafia)
where the bug actually lived rather than trusting a random draw to land
there — none of them were visible from reading one screen, and none of
them threw, typechecked wrong, or showed up in `npm run lint`.

**The method, since it's worth keeping for next time:** a throwaway
Playwright harness (`scripts/_bughunt.mjs` + `scripts/_bughunt_games.mjs`,
written, used for several hours, then deleted per the repo's own "repro.mjs"
convention, HANDOFF §8) that claimed two throwaway profiles
(`__bh_host__`/`__bh_guest__`, never the six real ones), pointed one browser
context at `/test` as host, one at `/test` as guest, and a third at `/tv`,
set `game_room.host_player` to the throwaway host for the duration (restored
in every run's `finally`, verified clean after each), and drove real games
through their real phase transitions via the actual buttons — not raw SQL,
per the brief's own §4 warning about that exact mistake. For games with a
random "subject"/"odd one out" (Mafia, Know Me Best), a small DB-side swap
function forced the throwaway player into that role so its own view could
actually be exercised, since the honest odds of a 2-in-8-seat random draw
landing on the test account are otherwise not worth waiting on. Two real
harness bugs surfaced and got fixed along the way (documented in the
script's own commit history before deletion, so only the lesson survives
here): an `Escape` keypress fired before the round had finished loading,
racing the rules-sheet auto-open exactly the way §4 warned about, so early
runs showed false "stalled" results that were actually just clicks landing
on a covered screen; and a too-broad Playwright locator
(`"main section, main div"` + `.first()`) matched the header's "?" button
before it ever reached an actual vote choice, reopening the rules sheet and
cascading a false failure into every game launched afterward. Both are
exactly the "verification that looked thorough and wasn't" trap §4
describes — worth remembering the shape of, not just the fix.

**Found and fixed, all four deployed and smoke-tested live:**

1. **Mafia's night-vote screen could never render, for the mafia player, on
   any night, ever — and the first fix alone would have quietly broken again
   on night two.** `round_secrets` is sealed until a round's `phase` is
   `reveal`/`done` (0005's RLS — `secrets open at the reveal`). Mafia derived
   `iAmMafia` from `secrets.find(s => s.idx === 0)?.author`, which is
   therefore only non-null exactly when `revealed` is true — but the
   night-vote UI was gated on `iAmMafia && !revealed`, two conditions that
   structurally can never hold at the same time. The mafia player saw
   "Eyes closed. The Mafia is choosing" on every single night, same as
   everyone else — there was no way, ever, for them to actually pick a
   target through the app. `src/games/huddle/mafia/index.tsx` — fixed by
   deriving `iAmMafia` from the player's own role card
   (`round_items`, `visible_to`-scoped, available immediately, not phase
   gated) — the exact source Spyfall already trusts correctly for
   "am I the spy". `mafiaId` from `secrets` is kept for the reveal-time uses
   that are genuinely safe (`nightVote` lookup, `endGame` scoring). **A
   second pass caught a follow-up bug in the same fix**, before it was fully
   trusted: the role card was read via `useCurrentItems()`, which filters to
   `round_items.idx === item_cursor` — correct for every other caller of
   that hook, wrong for Mafia specifically, which repurposes `item_cursor`
   as its own night/day counter (`isNight = cursor % 2 === 0`) rather than
   an item index. The role card is dealt once, always at `idx 0`. Spyfall
   and Chameleon deal the identical shape at `idx 0` but never advance the
   cursor at all, so this exact mismatch never bit them. The moment the
   cursor first advanced past night one (host taps "Move to day"), `myRole`
   — and `iAmMafia` with it — would have silently gone back to undefined/
   `false` for everyone, right as night two arrived; "Loading your role…"
   would have shown forever after, too. Fixed by reading the raw `items`
   array (cursor-independent) instead of `useCurrentItems()`, filtered only
   by `kind === "role"`. Verified live through a real night-1 → day-1 →
   night-2 cycle before trusting it — the first fix alone read as complete
   and passed a night-1-only check clean. While in the file: the mafia's
   own night-vote self-exclusion never worked either, on any night — it
   excluded `mafiaId`, sourced from the same sealed `secrets`, at exactly
   the moment it's needed; low-severity given the game is human-moderated
   anyway, but a one-line fix now that `iAmMafia` reliably gates the branch
   (exclude `me.id` instead).
2. **Drawful could only ever complete its first artist's turn before the
   whole round silently ended.** Drawful deals nothing but `visible_to`-scoped
   private prompts (`deal_private`, one per artist) — no public marker, unlike
   every other private-item game (Act It Out, Spell It Out, 30 Seconds,
   Speed Cards all also deal a public `deal_deck` marker alongside their
   private payload, specifically so this works). `useTotalItems()`
   (duplicated in both `PhoneView` and `TvView`) counts distinct `idx`
   values in the *client's own visible* `items` array — and since RLS means
   every device, including `/tv` (which holds no profile and therefore sees
   *nothing* `visible_to`-scoped), can see at most one such row ever,
   `total` was pinned at `1` for literally every player, every turn, the
   whole game. That makes `isLast = cursor >= total - 1` true starting from
   turn one, so the host's "Next turn" button silently behaved as "Finish
   round" — tap it after the very first artist and the round just ends.
   `src/games/arena/drawful/index.tsx` — fixed by dealing one public
   `deal_deck` marker per turn, copying the pattern the other four
   private-item games already use correctly. Verified live: the turn
   counter reads "Turn 1 of 6" now, not "Turn 1 of 1". **This fix's own
   live verification never actually exercised the artist's device** — every
   test that night landed on a non-artist view, which turned out not to be
   bad luck: a second, far more severe bug in the same file meant that was
   the *only* kind of device that could ever exist. `promptItem` was found
   via `i.kind === "role"` — but `deal_private()` (0007), the only thing
   Drawful ever calls to deal a prompt, always inserts `kind: 'private'`.
   `'role'` is `deal_roles()`'s tag (Spyfall/Chameleon/Mafia's odd-one-out
   primitive) — a different function this game never calls. `promptItem`
   could therefore never resolve to anything, for anyone, on any turn:
   `iAmArtist` was permanently `false`, the drawing canvas could never
   render, and the whole game could never advance past "someone's drawing"
   for even the very first turn, since no submission could ever exist to
   open voting on. **Drawful, as shipped up to this point, was completely
   unplayable — the turn-count fix made the counter correct on a game
   nobody could actually play a single turn of.** Found by deliberately
   forcing a throwaway test profile into the artist seat (the same
   `round_items.visible_to` database swap already used for Mafia and
   Chameleon this session) rather than trusting a 1-in-6-or-so chance of a
   random claim landing there on its own — which is exactly the odds that
   let it hide behind a clean-looking pass all night. Fixed by matching the
   check to what `deal_private` actually writes: `kind === "private"`.
   Verified live end to end this time: the artist's prompt and canvas
   render, a drawing submits successfully (confirmed via a direct
   `submissions` table read — `kind: 'drawing'`, correct `player_id`), and
   the host's dock correctly progresses to "Drawing's in → everyone titles
   it" afterward. **Once this class of bug turned up (a hardcoded `kind`
   string TypeScript can't check, since `RoundItem.kind` is typed as plain
   `string`), every `.kind === "..."` comparison across all 25 games got
   cross-referenced by hand against what its actual dealing RPC inserts** —
   `deal_deck` → `'deck'`, `deal_roles` → `'role'`, `deal_private`/
   `deal_private_answers` → `'private'`, `deal_hidden_answer`/
   `deal_test_hidden` → `'prompt'`, `deal_from_survey`/`deal_test_pair` →
   `'survey'`, `deal_forfeit` → `'forfeit'` (public marker) + `'private'`
   (the card), `contact_reveal_letter` → `'prefix'`, plus every
   client-inserted `submissions.kind`/`round_events.kind` string checked
   against the same file's own insert. Drawful was the only mismatch in the
   entire codebase — everything else lines up. Worth knowing the technique
   exists if a 26th game ever gets added: this bug class throws nothing,
   typechecks clean, and only shows up as "the screen that should have
   content just doesn't" on the one specific device that would ever notice.
3. **Both Buzz In variants showed every player — not just the host — a live
   "Next →" button that silently failed for anyone who tapped it.**
   `BuzzHost` (`src/games/arena/buzz-in/shared.tsx`, shared by Trivia and
   Name That Tune) rendered its dock unconditionally; every other game in
   the app gates its dock on `isHost`. A guest who tapped it would hit
   `set_cursor`/`set_phase`'s `assert_host()` check and fail server-side
   with nothing shown — the tap just does nothing, with no explanation.
   Fixed by adding an `isHost` prop and gating the dock on it, same as
   everywhere else.
4. **`most_likely_to` had no fallback if its one survey question came up
   dry.** `src/config/decks.ts` has carried a 16-prompt `MOST_LIKELY_TO`
   reserve deck since it was written, with a comment saying "these run
   after" the survey's own prompts — the exact shape `best_answer` already
   uses for its own reserve (`BEST_ANSWER_PROMPTS`) — but `most_likely_to`'s
   `start()` never actually called it. If `most_likely_prompt` had zero
   answers, the game would just throw and refuse to start, with the
   already-written fallback sitting there unused. Found auditing `decks.ts`
   for dead exports (`CHARADES`, `MINUTE_CHALLENGES`, `CHAOS_CARDS`,
   `WHEEL_SEGMENTS` are similarly unused — those back planned Tier-3 games
   that were never built, so leaving them is harmless and possibly useful
   as verbal-round material; `MOST_LIKELY_TO` was the one actually meant to
   be load-bearing). Not high-probability on the real day (several people
   have real answers to that question per §13/§14's counts), but a real gap
   with a one-line-away fix already sitting in the file. Wired up, mirroring
   `best_answer`'s exact try/`start_round`-then-`start_deck_round` shape.

**Content, not code:** two cards in `their-rounds.ts`'s `FORFEITS` deck
(Truth or Dare's Reckless-tier forfeit, §14) got rewritten after reading the
whole deck fresh, per the brief's own explicit ask. One sent an ambiguous,
romantic-sounding text ("I've been thinking about you all afternoon") to
"the person you message most today" — anyone from a parent to a coworker,
with zero context that it's a party game; softened, and now tells the
recipient it's a dare right after. The other asked the room to compose a
message to an ex — a genuinely common source of real regret, aimed at
someone with existing romantic history who never agreed to be part of the
bit; replaced with a room-writes-it text to a gossipy friend instead, same
nosy-not-cruel shape, no reopened wounds. This is a judgement call, not a
fact-check — worth a skim before Saturday if there's time, same as §14
already flagged for the whole deck.

**Verified, and how:** every fix above got a live click-through via the
harness (screenshots reviewed, not just "did it typecheck") before being
committed, `npx tsc --noEmit` / `npm run lint` (27-warning baseline held,
confirmed clean of the harness's own throwaway lint noise before each
commit) / `npm run build` all clean, and `npm run check:engine` (18 checks)
green after each push. **`npm run check` (Stage 1) hit Supabase's
anonymous-signin rate limit (~30/hr/IP, HANDOFF §8's own documented
ceiling) for roughly 40 minutes from around 04:15** — genuinely exhausted
by the volume of throwaway browser contexts this session's harness spun up
(three fresh anon sign-ins per run, run repeatedly while debugging the
harness itself, on top of the earlier undocumented session's own usage).
It cleared on its own by ~04:55, confirmed with a clean `npm run check`
run (all 12 checks) at that point — Stage 1 was never actually at risk;
nothing this session touched its code, and this was the same ceiling
HANDOFF §8 already documents as a known, temporary, non-regression signal
whenever it's hit.

**Hot Takes, Never Have I Ever, The Deep End, Fibbage, and Best Answer —
eventually reached, on a third attempt.** The first live batch ran out of
rate-limit budget before getting to these five; a second, faster attempt
(`scripts/_final_check.mjs`) hit a real harness artifact instead of a clean
result — it screenshotted too soon after launching each game and caught
mid-deal state. Fibbage's `start()` alone makes 8 sequential awaited RPC
calls (`start_deck_round` + `deal_deck` + `seed_truth_submission` × 6), and
a 1200ms wait wasn't enough for that to settle, so one screenshot showed
Fibbage's own title bar over The Deep End's leftover test content — a
stale-fetch artifact from the round that had just ended, not an app bug;
the client hadn't refetched `items` yet when the screenshot fired. A third
attempt (`scripts/_final_check2.mjs`, same deleted-after-use convention),
patient this time — it polls the database for the new round's items to
actually exist before touching anything, rather than a fixed wait — got a
clean run: **zero page/console errors across all five**, correct phase
transitions everywhere they were exercised (Hot Takes and The Deep End
both reached `phase=done` cleanly; Never Have I Ever, Fibbage, and Best
Answer each correctly advanced `item_cursor` through several items before
running past this pass's step budget — Fibbage in particular needs four
dock taps per item, not the one-or-two every other game needs, so ten
steps covers barely more than two facts of six). Nothing found, and this
time on real signal, not a guess. All five also read clean on the earlier
full line-by-line pass against the same bug classes §5 of the brief calls
out. Truth or Dare's forfeit card was reached and confirmed working live
in the very first batch, before the rate limit hit.

### Stream two and three

The brief's design-research stream (§6) is largely covered by the
nine-TV-board work this section opened with — that *is* the highest-value
design item §6 called out ("the nine TV boards that exist... set the
standard... the other 16 fall back to the generic board").

**Stream three's sound system got built, once the rate limit cleared and
there was runway left to verify it properly.** §7: "there is none anywhere.
A buzzer, a reveal sting, a timer tick — even three well-chosen effects
would transform how the room feels." Deliberately not a per-game
integration — 25 files' worth of edits and 25 files' worth of risk the
morning of the event is the wrong shape for this late in a session. Instead,
`src/lib/sound.ts` (three synthesized WebAudio tones, no CDN, no shipped
audio files — `tick`/`buzz`/`reveal`) wired into the three shared components
every game already renders through:

- `RoundTimer.tsx` — a tick on the last 3 seconds of any countdown, guarded
  by a ref so the 250ms poll underneath can't replay it several times
  inside one second.
- `src/games/arena/buzz-in/shared.tsx` — a buzz on the *local* tap, not the
  server's confirmation of who won; a real buzzer gives instant feedback
  regardless of whether you turn out to be first, and waiting for a
  round-trip would make it land noticeably late.
- `GameShell.tsx` — a three-note reveal sting, firing once when a round is
  actually *observed* transitioning into `reveal` (a ref starting at the
  current phase, not `undefined`, so rejoining an already-revealed round
  doesn't retroactively play it).

A mute toggle (🔊/🔇) sits in `GameShell`'s header next to the existing "?"
and "✕". Its state is read via a **lazy `useState` initializer**, not an
effect — copying `rulesOpen`'s own pattern two lines above it in the same
file, and for the same reason: a `setState` inside a bare effect here trips
the exact lint rule this codebase already treats as a real bug class.
**This one was actually caught by `npm run lint` before it ever reached a
browser** — the first draft used an effect, lint failed with an error (not
a warning), and the fix was switching to the initializer pattern already
sitting right there to copy. Exactly the verification loop doing its job.

Audio unlocks on the same claim-tap gesture the whole app already requires
before any of this can render (PLAN.md's iOS notes), so there's no separate
"tap to enable sound" screen to build.

**Verified live**, not just typechecked: header layout holds even on the
longest title in the app ("Buzz In · Name That Tune", wraps to two lines,
all three icons still sit cleanly with no overlap — checked by measuring
bounding boxes, not eyeballing a screenshot); the mute toggle flips and
survives a page reload; a round driven through to its own reveal exercises
the sting with zero page/console errors; Buzz In's buzzer path exercised
directly on both the shared button and the host's real dock. Throwaway
verification script (`scripts/_sound_check.mjs`), deleted after use, same
convention as every other diagnostic this session.

**Haptics** (also suggested in §7) was not attempted: PLAN.md's own stack
section already ruled it out on arrival — "No haptics. The Vibration API
doesn't exist on Safari, full stop," and all six phones are iPhones — so
it would be dead code on every device that matters, not a small win.

### Verified, end to end

`npx tsc --noEmit`, `npm run lint` (27-warning baseline, unchanged),
`npm run build` (all 9 routes prerender), `npm run check:engine`
(18 checks), and `npm run check` (12 checks, once the rate limit cleared
around 04:55 — see above) all pass clean at the tip, including after the
sound system landed. Every change above — five bug fixes plus the sound
system — was pushed as its own commit, watched through `gh run watch` to
a successful deploy, then confirmed with `npm run live` before moving to
the next — the live site was never left broken.

### Still open

- **A richer Awards/hub "moment" polish** — the countdown hitting zero, the
  Awards screen's own weight — called out by the brief, not attempted
  beyond what already existed (both already have hero art from §16 and
  function correctly; deeper choreography wasn't judged worth the risk this
  late relative to its value). Sound (§7's other ask) did get built — see
  stream two/three above.
- **Real six-tab dress rehearsal on real iPhones, and the bypass
  code/venue** — same items every session since §12 has carried forward;
  still the bar, still Choolwe's own to run. Venue is done (§10 of
  `docs/POLISH_BRIEF.md`); bypass code was set by Choolwe directly and
  stays undocumented here on purpose (§6).
