# Commutation

A realtime party app for six people, built for one Saturday.

It has two lives. **Before the day** it's an info hub and a private survey.
**On the day** it becomes a synced multiplayer game console — around 25 games
across three halls, playable on six iPhones with an optional TV.

- **Setup:** [SETUP.md](SETUP.md) — 10 minutes, one time
- **The full plan:** [docs/PLAN.md](docs/PLAN.md)

## Status

**Stage 1 — shipped.** Info hub, countdown, profile claiming, and the eight-section
survey. This is what goes out to the group now.

**Stage 2 — built, pre-rehearsal.** The game console: 16 games across the Vault,
the Huddle and the Arena, unlocking automatically at the countdown. Still needs
a real six-tab-plus-TV dress rehearsal and an iPhone pass before Saturday — see
[docs/HANDOFF.md §12](docs/HANDOFF.md#12-stage-2--what-actually-got-built-wed-12-aug).

## The one rule

Survey answers are readable **only by their author**. Not by the other players,
not by the host, not through the API — that's enforced by row-level security in
[`supabase/migrations/0001_stage1_survey.sql`](supabase/migrations/0001_stage1_survey.sql),
not by convention. Answers are released only by the game engine, inside a live
round, on the day.

The hub shows everyone's answer *count* so people can chase each other. Never
content. The reveals only work on Saturday if nobody has read them first.

## Running it

```bash
npm install
cp .env.local.example .env.local    # add your two Supabase values
npm run dev
```

| Command | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate app icons from the inline SVG |
| `npm run shots` | Screenshot the UI at iPhone size into `.shots/` (needs `dev` running) |

`/preview` renders the real screens against mock data, so you can check a
layout or copy change without a database attached.

## Editing the details

Almost everything you'd want to change lives in
[`src/config/`](src/config/):

| File | Holds |
|---|---|
| `event.ts` | Address, times, schedule, what to bring, unlock time, bypass code |
| `crew.ts` | The six players |
| `survey.ts` | Every survey question |

## Built for iPhone

All six phones are iPhones, so the app targets WebKit and is tested on a real
device. The base layer in [`globals.css`](src/app/globals.css) handles the iOS
behaviours that would otherwise break a party game: pull-to-refresh reloading
mid-round, inputs zooming the page on focus, `100vh` being wrong, and buttons
hiding under the home indicator.

Add it to your Home Screen — it launches fullscreen and dodges Safari's 7-day
localStorage eviction.
