# Setup

**Status: live.** → <https://choolwec.github.io/commutation/>

Supabase is provisioned, all four migrations are applied, anonymous sign-in is
on, and the database is verified clean — six free profiles, zero answers.
Pushing to `master` rebuilds and redeploys automatically.

---

## Before you send the link

1. **Fill in [`src/config/event.ts`](src/config/event.ts)** once Tuesday's venue
   is confirmed, and set `location.pending` to `false` at the same time — that
   swaps the "still being sorted" note for the real address.
2. **Change `bypassCode`.** It's still `letmein`.
3. **`npm run reset`** if you've been testing on your own phone — hands every
   profile back and restores the default avatars.
4. Commit and push. The site updates in about a minute.

---

## Why it's on GitHub Pages and not Vercel

Vercel's `*.vercel.app` edge range (`216.198.79.0/24`, `64.29.17.0/24`) is not
routable from Zambia. `vercel.com` and `nextjs.org` load fine; every deployed
`*.vercel.app` hostname resolves and then times out. Confirmed on two
independent networks, on both PC and phone.

The app was correct the whole time — the link simply couldn't be opened, which
would have been true for everyone else too. So the app builds as a fully static
export (`output: "export"` in [`next.config.ts`](next.config.ts)) and is hosted
on GitHub Pages. Cloudflare Pages and Netlify were both verified reachable too,
if Pages ever needs replacing.

Nothing was lost in the move: every route was already prerendered, and all the
live behaviour comes from Supabase over HTTPS from the browser.

---

## How it was set up

### 1 · Supabase project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**,
named `commutation`.

### 2 · Migrations

**SQL Editor** → **New query**, then paste and run each file in
[`supabase/migrations/`](supabase/migrations/) in order:

| File | What it does |
|---|---|
| `0001_stage1_survey.sql` | Tables, RLS, seeds the six of you |
| `0002_profile_takeover.sql` | Lets a stranded profile be reclaimed |
| `0003_write_ownership.sql` | First attempt at write ownership — superseded |
| `0004_save_answer_rpc.sql` | The write path the app actually uses |

Each should end with `Success. No rows returned.` **Watch for that message** —
a half-applied migration fails silently and is genuinely hard to spot later.
`npm run check` confirms the real state.

### 3 · Anonymous sign-in

**Authentication → Sign In / Providers → Anonymous sign-ins → ON.**
This gives each phone a stable identity without anyone making an account.
The app cannot work without it.

### 4 · Keys

**Settings → API keys** → Project URL and the `anon` / `publishable` key.

These live in three places: `.env.local` for local dev, and GitHub Actions
secrets `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the
build. `NEXT_PUBLIC_*` values are inlined at build time, so they must be
present when the workflow runs, not at runtime.

The anon key is safe in a browser bundle by design — row-level security
protects the data, not the key. Never put the `service_role` key here.

### 5 · Local

```bash
cp .env.local.example .env.local   # paste your two values
npm install
npm run dev
```

<http://localhost:3000> → "Who are you?" with all six names.

---

## Everyday commands

| Command | Does |
|---|---|
| `npm run check` | 13 assertions against the live database, including that one user cannot read another's answers. Prints pass/fail only — never answer content. |
| `npm run reset` | Hands every profile back, purges test rows, restores default avatars. |
| `npm run e2e` | Drives the local app in a phone-sized browser: claims, types, reloads, asserts the answer persisted and the hub leaks nothing. |
| `npm run live` | Smoke-tests the deployed site — assets, Supabase connectivity, all six names. |
| `npm run shots` | Screenshots the UI at iPhone size into `.shots/`. |

---

## What to send the group

> Right — Saturday, 1 till 8. Everything's here:
> **https://choolwec.github.io/commutation/**
>
> Tap your name, then answer whatever you want. Nothing's compulsory, skip
> anything. It saves as you go so you can do it in bits.
>
> Two things. **Add it to your Home Screen** (share button → Add to Home
> Screen) so you don't lose your place. And **nobody sees your answers** —
> not the others, not me. They only ever show up inside the games.
>
> The boring ones are worth nothing. Go as far as you dare. **By Tuesday.**

---

## Checking who's answered — and who hasn't

The hub shows everyone's answer **count**, never their content. That's the
whole design: the reveals only work on Saturday if nobody, including you, has
read them first. Chase people on the number, not the substance.

---

## If something breaks

| Symptom | Cause |
|---|---|
| "Almost there" screen | Build ran without the two GitHub Actions secrets. Check **Settings → Secrets and variables → Actions**, then re-run the workflow. |
| "Couldn't reach the database" | Anonymous sign-ins switched off, or a migration didn't apply. Run `npm run check`. |
| Page loads unstyled, survey button dead | `basePath` mismatch. Pages serves from `/commutation`, set by `NEXT_PUBLIC_BASE_PATH` in the deploy workflow. |
| Wrong name claimed | Hub → "Not \<name\>?" hands it back. Or just tap the right name — taking a profile back never reveals anyone's answers. |
| Someone locked out after clearing Safari | Tap their name and confirm the takeover. Past answers stay sealed but new ones save fine. |
| Countdown looks wrong | `unlocksAt` in `src/config/event.ts`. Months are 0-indexed: `7` = August. |
| Deploy skipped, "not a member of the team" | Vercel-era issue, no longer applies. The repo's git identity is pinned to `choolwecheelo22@gmail.com` regardless. |
