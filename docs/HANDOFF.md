# HANDOFF — read this first

For a fresh Claude session picking up this project with zero prior context.
Read this whole file before touching anything — several mistakes were made
and fixed along the way, and the fixes only hold if you don't undo them
without knowing why they're there.

**Snapshot taken:** Sun 9 Aug 2026, evening. If it's later than that, treat
anything time-sensitive below (survey counts, "not yet built") as stale and
re-verify rather than trust it.

---

## 1. What this is

**Commutation** — a two-stage web app for a hang with 6 people (Choolwe,
Chileleko, Joy, Latasha, Niza, Chibesa — 2 guys, 4 girls, platonic, no
drinking) on **Saturday 15 Aug 2026, 13:00–20:00**.

- **Stage 1** (info hub + a private, sealed survey) — **built, live, verified.**
- **Stage 2** (a synced multiplayer game console that unlocks automatically
  at 13:00 Saturday) — **not started.** Full design in [PLAN.md](PLAN.md).

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
- **Stage 2:** not started. Deliberately — the plan is to wait for more
  survey data before running the content-tiering subagent (see §2), and to
  start the actual game-console build midweek (per PLAN.md: Wed–Fri, dress
  rehearsal Friday night, unlock fires Sat 13:00).

**Choolwe's outstanding to-dos** (not something to do for him without
asking, but worth surfacing if picking this up mid-week):
- Real venue address, once confirmed — `src/config/event.ts`, plus flip
  `location.pending` to `false`.
- Change `bypassCode` from `"letmein"` — and per §6, move it out of a public
  source file entirely before `/unlock` is built to consume it.
- Nudge Chileleko, Joy, Latasha — currently zero answers each.

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
