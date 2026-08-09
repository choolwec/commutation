# Setup

**Status: done and deployed.** Supabase is provisioned, all four migrations are
applied, and the app is live at
<https://commutation-two.vercel.app>.

Everything below is kept as a record of how it was set up, and for the
day-to-day commands at the bottom.

## Before you send the link

1. **Open it on your iPhone.** If you get a Vercel login wall instead of
   "Who are you?", turn protection off: Vercel → the project → Settings →
   Deployment Protection → **Vercel Authentication → Disabled** → Save.
   Your friends aren't on your Vercel account, so they'd otherwise be stuck.
2. **Fill in [`src/config/event.ts`](src/config/event.ts)** once Tuesday's
   venue is confirmed. Set `location.pending` to `false` at the same time —
   that swaps the "still being sorted" note for the real address.
3. **Change `bypassCode`.** It's still `letmein`.
4. `npm run reset` — hands every profile back so the group opens a clean slate.

---

## How it was set up

## 1 · Create the Supabase project (3 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it `commutation`. Pick the region closest to you. Set a database password
   and let the browser save it — you won't need it again.
3. Wait for it to finish provisioning (~2 min).

## 2 · Run the database migrations (1 min)

In the project, open **SQL Editor** → **New query**, then paste and run each
file in [`supabase/migrations/`](supabase/migrations/) in order:

| File | What it does |
|---|---|
| `0001_stage1_survey.sql` | Tables, RLS, seeds the six of you |
| `0002_profile_takeover.sql` | Lets a stranded profile be reclaimed |
| `0003_write_ownership.sql` | First attempt at write ownership — superseded |
| `0004_save_answer_rpc.sql` | The write path the app actually uses |

Each should end with `Success. No rows returned.` **Watch for that message** —
a migration that half-applies fails silently and is genuinely hard to spot
later. Run `npm run check` afterwards to confirm.

## 3 · Turn on anonymous sign-in (30 sec)

**Authentication → Sign In / Providers → Anonymous sign-ins → toggle ON → Save.**

This is what gives each phone a stable identity without anyone making an account.
**The app cannot work without it** — if you skip this step you'll get a
"couldn't reach the database" screen.

## 4 · Grab your two keys (1 min)

**Settings → API keys**. You need:

| Field | Goes into |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

The anon key is safe to expose in a browser — RLS is what protects the data,
not the key. Never use the `service_role` key here.

## 5 · Run it locally (2 min)

```bash
cp .env.local.example .env.local   # then paste your two values in
npm install
npm run dev
```

Open <http://localhost:3000>. You should see "Who are you?" with all six names.

## 6 · Deploy (3 min)

```bash
git init && git add -A && git commit -m "Commutation stage 1"
gh repo create commutation --private --source=. --push
```

Then at [vercel.com/new](https://vercel.com/new): **Import** the repo →
add the same two environment variables → **Deploy**.

Vercel gives you a URL like `commutation.vercel.app`. That's the link you send.

---

## Everyday commands

| Command | Does |
|---|---|
| `npm run check` | 13 assertions against the live database, including that one user can't read another's answers. Prints pass/fail only — never answer content. |
| `npm run reset` | Hands every profile back and purges test rows. Run before sending the link. |
| `npm run e2e` | Drives the real app in a phone-sized browser: claims, types, reloads, asserts the answer persisted and that the hub leaks nothing. |
| `npm run shots` | Screenshots the UI at iPhone size into `.shots/`. |

---

## What to send the group

> Right — Saturday. Everything's here: **https://commutation-two.vercel.app**
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

## Editing the details later

Everything you'd want to change lives in [`src/config/event.ts`](src/config/event.ts) —
address, times, schedule, what to bring, the unlock time, the bypass code.
Change, commit, push. Vercel redeploys automatically.

## Checking who's answered — and who hasn't

The hub shows everyone's answer **count**, never their content. That's the
whole design: the reveals only work on Saturday if nobody, including you, has
read them first. Chase people on the number, not the substance.

## If something breaks

| Symptom | Cause |
|---|---|
| "Almost there" screen | Env vars missing or misspelled. On Vercel, redeploy after adding them. |
| "Couldn't reach the database" | Step 3 (anonymous sign-ins) not done, or the migration didn't run. |
| Wrong name claimed | On the hub, tap "Not <name>?" at the bottom to hand it back. Answers stay saved. |
| Countdown looks wrong | `unlocksAt` in `src/config/event.ts`. Months are 0-indexed: `7` = August. |
