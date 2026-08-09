# Setup — 10 minutes, one time

Choolwe: this is the only doc you need. Three accounts, two keys, one paste of SQL.

---

## 1 · Create the Supabase project (3 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it `commutation`. Pick the region closest to you. Set a database password
   and let the browser save it — you won't need it again.
3. Wait for it to finish provisioning (~2 min).

## 2 · Run the database migration (1 min)

1. In the project, open **SQL Editor** → **New query**
2. Open [`supabase/migrations/0001_stage1_survey.sql`](supabase/migrations/0001_stage1_survey.sql),
   copy the whole file, paste it in, hit **Run**.
3. You should see `Success. No rows returned.`

This creates the tables, the row-level security policies, and seeds all six of you.

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

## What to send the group

> Right — Saturday. Everything's here: **<your-vercel-url>**
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
