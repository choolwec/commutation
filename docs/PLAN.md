# COMMUTATION — a realtime party app for 6

> **Status:** Stage 1 in build, Sun 9 Aug 2026. This is the living plan; it lives in the repo so it stays next to the code.

## Context

Choolwe is hosting a hang for 6 friends (Choolwe, Chileleko, Joy, Latasha, Niza, Chibesa — 2 guys, 4 girls, platonic, no drinking) on **Saturday 15 August 2026, ~13:00**. Today is Sunday 9 August, so there are 6 days.

The app has two lives:

1. **Before the day** — an info hub *and* a **secret survey** each person fills in privately.
2. **On the day** — at 13:00 Saturday it transforms into a synced multiplayer game console.

Around 25 games in three halls. **The Vault** runs on their own sealed survey answers — the rounds they'll still be quoting in a year, because "who wrote this confession?" hits infinitely harder when it's really Niza's. **The Huddle** is phone-in-hand games for six people sat in a circle, needing nothing and nobody. **The Arena** is TV-first: the big screen is the board, and every phone becomes a different controller.

The survey therefore ships **first and immediately**, with a 1–2 day answer window, while the standalone games get built in parallel and the personalized ones are tuned to whatever actually came back.

**Hard privacy rule, carried through the whole build:** survey answers are never shown to Choolwe and never printed into the terminal or chat. They live in Postgres behind row-level security and are released only by the game engine, inside an active round, on the day. I read them once, alone, to sort them into the escalation tiers — and that is the only thing I do with them. Nothing surfaces to Choolwe before the reveal. This is a build constraint, not a nicety: it's what makes the reveals land, and it's what makes people answer honestly in the first place.

Content escalates **progressively wild** across the day (Warm → Real → Reckless), full adult, only light on anything sexual per the platonic group. The group is close and Choolwe knows them all well, so there are no per-person opt-outs — full throttle for everyone. Nobody tags their own answers either: the survey pushes everyone to go as reckless as they can, and I do the sorting afterwards, which keeps people from self-censoring by pre-labelling.

---

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 | One codebase serves phones + TV; free on Vercel |
| Realtime | Supabase Realtime — **Broadcast from Postgres triggers**, plus Presence | Authoritative state in the DB, `realtime.broadcast_changes()` pushes it; better than `postgres_changes` for authorization and scale |
| Identity | Supabase **anonymous auth**, one stable UID per device | Makes RLS real, so "private answers" are actually private |
| Storage | Supabase Storage | Photo quests → end-of-day recap gallery |
| Host | Vercel (GitHub auto-deploy) | Accounts already exist |

Free tier is comfortably clear of the limits (200 concurrent connections, 2M messages/mo) for 6 phones plus a TV.

**Two rigged-to-not-fail details:** free Supabase projects pause after ~7 days idle, so a Vercel cron pings the DB daily — the app must be awake at 13:00 Saturday. And the venue wifi may be bad, so every game degrades to a local-state fallback if the socket drops, and reconnects into the live round.

---

## Built for iPhone, only

All six are on iPhones, which means **WebKit is the only engine that has to work.** That's a real simplification — no cross-browser matrix, one device to test, uniform behaviour — but iOS Safari has a specific set of traps that would each individually ruin a party game. Handling them is not polish; it's the difference between an app that feels native and one that feels broken.

**The three that would actually wreck the day:**

- **Screens sleeping mid-round.** An iPhone locks after ~30 seconds of not being touched, which is most of any round where you're watching the TV or listening to someone answer. The **Screen Wake Lock API** works in iOS Safari 16.4+ and is held for the whole session. (It was broken in installed PWAs until iOS 18.4 — so if anyone's on an older phone, the app detects the failure and falls back to a hidden looping video, the old reliable trick.)
- **Locked phones killing the socket.** When iOS backgrounds Safari, the WebSocket dies silently. Every screen listens on `visibilitychange` and, on return, reconnects and **resyncs full round state from Postgres** rather than trusting the local copy. Assume this happens constantly; design so it's invisible.
- **Pull-to-refresh mid-game.** A stray downward swipe reloads the page and dumps you out of a round. `overscroll-behavior: none` everywhere, and `touch-action: none` on every drawing canvas and drag control.

**The rest, handled once in the base layer:**

- **16px minimum on every input** — below that, iOS auto-zooms the page on focus, which would make the survey miserable to type into. This is the single most common iOS web bug.
- **Safe-area insets** — the Dynamic Island and the home indicator eat content. Primary buttons sit above `env(safe-area-inset-bottom)`, or the most-tapped button in the app is half-swallowed.
- **`100dvh`, never `100vh`** — Safari's collapsing toolbar makes `100vh` wrong by ~60px, so full-screen game views jump on scroll.
- **Audio unlocked on a gesture** — iOS blocks all audio until the user taps. The join screen doubles as the unlock, so buzzers and win-stings actually fire later.
- **No haptics.** The Vibration API doesn't exist on Safari, full stop. Buzzers and timers get audio and visual punch instead — worth knowing now rather than designing a feedback system around a phantom.
- **HEIC photos** — iPhone camera output isn't universally renderable, so photo quests resize and re-encode to JPEG on the phone before upload. Also keeps the 1GB free storage tier comfortable.
- **Add to Home Screen** — with `apple-touch-icon` and a proper manifest, it launches fullscreen with no Safari chrome and genuinely feels like a downloaded app. The pre-Saturday message tells everyone to install it.
- **localStorage eviction** — Safari clears it after 7 days of non-use for uninstalled sites. Installing dodges this, but profiles are re-claimable by name regardless, so nobody can get locked out of their own identity.

**One upgrade this unlocks:** **Tilt Race** moves out of "first to cut." Motion controls needed `DeviceOrientationEvent.requestPermission()` behind a user tap on iOS and behaved differently everywhere else — but with six identical devices, if it works on one iPhone it works on all six. It stays a stretch goal on time, not on risk.

---

## STAGE 1 — Ship today: the survey + info hub

Deployed and sent to the group tonight. Answer window closes Tuesday 11 Aug.

### Info hub (landing)
Live countdown to Saturday 13:00, the 6 crew avatars with a "filled in the survey ✅" indicator (social pressure, no content revealed), where/when/what-to-bring, and a map link. Event details are placeholders in **one config file**, `src/config/event.ts`, for Choolwe to fill in.

### The survey
Phone-first, save-as-you-go, resumable. **No question is compulsory** — every one has a visible Skip. A progress ring rewards completion without demanding it.

The framing throughout is *go as far as you dare*. Copy leans on it: "the tamest answer is the wasted one", "nobody sees this until it's already too late", and a visible note that answers stay sealed from everyone — Choolwe included — until the round they appear in. Nothing is self-labelled for intensity; that's my job later, and asking people to grade their own confession is exactly what makes them water it down.

| Section | Feeds | Notes |
|---|---|---|
| **1. Make it yours** | Avatars, theme | Claim your name, pick emoji + color, pick an app theme, set a "walk-on" hype word announced when you win a round |
| **2. About you** | *Know Me Best* | ~10 personal questions others will later try to predict |
| **3. Confessions** | *Who Wrote It?* | Anonymous. Pushed hard toward the reckless end — the spicier it is, the better the round plays |
| **4. Hot takes** | *Hot Takes* dial, debates | Opinions on a spectrum. Prompted for the ones that would actually start an argument |
| **5. About the group** | *Most Likely To*, awards | Predictions about who does what |
| **6. Build the game** | Everything | Write your own truth, your own dare, Most-Likely-To prompt, Quiplash prompt, deep question — go as filthy-brave as you like |
| **7. Invent a round** | A real game | Free-form: **describe a game you want to play, one sentence is plenty.** "Everyone rates each other and the lowest score has to call someone" is enough to build from. I turn whatever comes back into an actual playable round in the app. Each person gets a couple of slots |
| **8. Logistics** | Info hub | Arrival time, what you're bringing, food |

Section 7 is the one to make loud — it's the section that turns the app from something Choolwe made *for* them into something they all made.

### Schema
`players`, `survey_questions`, `survey_responses` (RLS: author-only read until unlock), `custom_content`, `game_ideas`. Answer content is never exposed to a client-side query — only to the server-side game engine during a live round.

### Handover
Choolwe does **not** collect or forward answers. I pull them with a service-role script straight into the build, read only what's needed to tune game balance, and print nothing.

---

## STAGE 2 — Build Mon–Fri: the game console

The Huddle and the Arena don't wait on anybody, so they start the moment the survey is live. When the answers land on Tuesday there are two extra jobs: sort every submitted confession, truth, dare and hot take into Warm / Real / Reckless so the day escalates properly, and turn the section-7 game ideas into real rounds. Anything buildable in the time gets built; anything too big becomes a **manual round** — the app runs the scoring, timers and reveals while the rules get explained out loud. That costs almost nothing to support and means nobody's idea gets binned.

Unlocks automatically at Sat 15 Aug 13:00 via live countdown, with a **secret bypass code** Choolwe holds to force it open early if plans shift.

### Three halls

The hub splits into three rooms, each a genuinely different mode of play. This is the Jackbox lesson: their packs work because a *drawing* game, a *bluffing* game and a *trivia* game demand different things from a room, and the best night rotates between them rather than grinding one format.

> ### 🔒 THE VAULT
> *Sealed until the day. Runs on their own answers.*
> ### 📱 THE HUDDLE
> *Phone-in-hand, sat in a circle. No TV needed — works in the garden, in the car, anywhere.*
> ### 📺 THE ARENA
> *TV is the stage, every phone is a remote. Only playable with the laptop plugged in.*

The Vault is unforgettable but must never be load-bearing — if three people ignore the survey, the day still has to be excellent, so the other two halls stand entirely on their own.

---

### 🔒 THE VAULT — questionnaire games

- **Who Wrote It?** — a real confession from the survey; guess the author. Points for guessing right, points for staying hidden. *The centerpiece of the whole app.*
- **Know Me Best** — one person is the subject; everyone predicts their real survey answers; side-by-side reveal on whichever screen is available.
- **Paranoia** — the app privately sends a question to one phone; they say only the answer out loud; a coin flip decides whether the question is ever revealed. Runs off their submitted questions.
- **Truth or Dare, tiered** — Warm → Real → Reckless, tiers assigned by me from their own submissions, with a **pass-token economy**: 2 passes each for the whole day, each visibly costing leaderboard points.
- **Hot Seat** — 90 seconds, one person, the other five firing anonymous questions from their phones.
- **The Deep End** — rotating deep questions, one answers, others tap "same" / "never knew that".
- **Their Rounds** — whatever they invented in survey section 7, built for real.

### 📱 THE HUDDLE — handheld phone games

Every one of these works with six people sat in a circle and nothing else. Phones excel here at exactly what paper is bad at: dealing secret roles, delivering private clues, and taking six simultaneous votes without anyone peeking.

- **Spyfall** — every phone shows the same location; one shows *"you're the spy."* Question each other, then vote. Six is the ideal count.
- **The Chameleon** — a grid of 16 words, everyone knows the secret one except the chameleon; each says one word aloud; vote on the faker.
- **Most Likely To** — secret vote for a person, live bar-chart reveal.
- **Hot Takes** — one player secretly sees a target on a spectrum ("Overrated ↔ Underrated"), gives one clue, the rest drag a dial; scored by distance.
- **Never Have I Ever** — tap in/out, live tally, escalating deck.
- **Fishbowl** — everyone drops clues into a shared bowl, then the same clues run three rounds: describe freely → one word only → charades. Gets funnier each round.
- **Act It Out** — charades with app-dealt prompts, timer and scoring.
- **Minute to Win It** — a deck of physical 60-second challenges, timer and scoreboard run by the app. Gets everyone off the sofa, which the day needs somewhere in the middle.
- **Photo Quests** — a background bingo card of photo challenges, open all day, feeding the recap.

### 📺 THE ARENA — TV games, phones as controllers

Built TV-first: the big screen holds the board, the reveals, the timers and the scoreboard, and each phone renders a completely different UI — a controller, not a mirror. The TV never shows anything secret, so nobody has to look away.

- **Drawful** — you draw on your phone with your finger; the TV displays it; everyone types a fake title for it; then everyone votes on which title was the real one. Points for fooling people. The single best use of a phone-as-controller there is.
- **Telephone Pictionary** — write a phrase → next person draws it → next writes what they see → around all six. The mangled chains replay on the big screen at the end, and the replay is the whole payoff. *Plays in either hall, but it's a different game on a TV.*
- **Fibbage** — an obscure true fact with a blank; everyone submits a fake answer on their phone; the TV shows all the lies mixed with the truth; find it. Points for finding it, more for fooling. Reliably the loudest game in any room.
- **Best Answer** — Quiplash-style: a prompt, everyone types, then anonymous head-to-head matchups on the big screen while phones vote.
- **Buzz In** — trivia with real first-to-buzz lockout. The board lives on the TV, phones are buzzers. This is the thing the realtime layer makes trivial and that paper simply cannot do.
- **Codenames, 3 v 3** — the 5×5 grid fills the TV; the two spymasters see the secret key privately on their phones. Six people splits perfectly into two teams.
- **Fake Artist** — one shared canvas on the TV, everyone drawing one stroke each from their phone, while one player doesn't know the word and is faking it. Watching the drawing appear live is the entire appeal.
- **The Wheel** — a big physical-feeling spinning wheel on the TV for dares, forfeits and bonus rounds; phones tap to spin. Cheap to build, enormous for pacing.
- **Tilt Race** *(stretch)* — phones become actual motion controllers, tilting to steer a race on the TV. Gated behind the one-time iOS motion-permission tap; six identical iPhones make it predictable, so it's a question of build time rather than compatibility.

### Shape of the day

| Act | Feel | Hall | Games |
|---|---|---|---|
| **1 · WARM** | arrival, ~30 min | 📱 | Roll Call → Most Likely To → Hot Takes |
| **2 · LOUD** | ~60 min | 📺 | Drawful → Fibbage → Best Answer |
| **3 · SHARP** | ~60 min | 📺 | Codenames 3v3 → Buzz In → Fake Artist |
| **4 · MOVE** | shake it up | 📱 | Minute to Win It → Act It Out → Fishbowl |
| **5 · SUSPECT** | lights down | 📱 | Spyfall → The Chameleon |
| **6 · DEEP** | breather | 🔒 | The Deep End → Know Me Best → Who Wrote It? |
| **7 · RECKLESS** | evening, full throttle | 🔒 | Paranoia → Never Have I Ever → Truth or Dare → Hot Seat → Their Rounds |
| **CLOSING** | | 📺 | Telephone Pictionary replay → Awards → recap gallery |

Nothing is on rails — the host launches any game from any hall at any time. The acts are a running order the app nudges toward, not a track it's locked onto, and if the laptop never appears the Huddle and Vault alone carry the entire day. **Awards** auto-computes superlatives from real data: Most Voted, Best Liar, Most Fooled, Biggest Coward (most passes), MVP crown.

### Build priority

Three days is not enough for all 25, so they ship in order and the day is complete at every stop:

1. **Core (must ship)** — Roll Call, leaderboard, TV mode, Drawful, Fibbage, Telephone Pictionary, Most Likely To, Hot Takes, Spyfall, Truth or Dare, Paranoia, Who Wrote It?. *This alone is a full, excellent day across all three halls.*
2. **Then** — Best Answer, Buzz In, The Wheel, The Chameleon, Know Me Best, Never Have I Ever, Hot Seat, Their Rounds, Awards + recap.
3. **Stretch** — Codenames, Fake Artist, Fishbowl, Act It Out, Minute to Win It, Chaos Cards, Tilt Race.

The time risk sits in tier 3's shared-canvas and team logic. Drawful is in tier 1 despite needing a canvas because it's the game that justifies the TV — and its canvas is single-player, which is far simpler than Fake Artist's shared one.

### Systems running underneath all day
- **Leaderboard** — persistent, always visible, crown on #1
- **Chaos Cards** — random modifiers ("double points", "swap scores with the person on your left", "next round is silent")
- **Photo Quests** — a background bingo card of photo challenges anyone can complete any time; feeds the recap
- **TV mode** — `/tv` route: big board, QR to join, live scores, reveals, timers. Arena games require it; Huddle and Vault games ignore it entirely, and the hub greys the Arena out until a TV actually connects, so nobody starts a game the room can't play.

### Realtime engine
One persistent room. Round state lives in Postgres (`rounds`, `submissions`, `votes`, `scores`); a trigger calls `realtime.broadcast_changes()` on a `room:commutation:*` topic so all six phones and the TV move in lockstep. Presence powers the online dots. Host device (Choolwe by default, transferable) advances rounds.

---

## Files

```
src/config/event.ts        ← placeholders Choolwe edits: address, time, schedule
src/config/crew.ts         ← the 6 players
src/lib/supabase/          ← client, server, realtime channel helpers
src/app/(hub)/             ← Stage 1: countdown, info, survey
src/app/(game)/            ← Stage 2: hub, /play/[game], /tv
src/games/vault/<game>/    ← 🔒 questionnaire games
src/games/huddle/<game>/   ← 📱 handheld games
src/games/arena/<game>/    ← 📺 TV games
supabase/migrations/       ← schema + RLS + broadcast triggers
```

Every game implements a shared `GameModule` contract — `hall`, phases, scoring, `PhoneView`, `TvView`, `requiresTv` — so adding a game later, including whatever they invent in survey section 7, is a new folder rather than a refactor. The contract is deliberately built before their ideas arrive, precisely so unknown games are cheap to add on Wednesday. Arena modules ship both views; Huddle and Vault modules ship only `PhoneView` and are exempt from ever needing a screen.

---

## Verification

**Stage 1, before sending the link:** run locally, then complete the survey end-to-end **on a real iPhone, not a simulator** — confirm no input zooms the page on focus, no button hides behind the home indicator, and that closing Safari mid-survey and coming back resumes where you left off. Confirm skipping every single question still submits. Then the critical check: sign in as a second anonymous user and attempt to read the first user's responses; **RLS must refuse.** Deploy, open the live URL on a phone, verify the countdown, install it to the Home Screen to check it launches fullscreen, then send.

**Stage 2, before Saturday:** a full six-tab dress rehearsal — six browser profiles plus a TV tab, playing one round of every game start to finish. Then the same on **a real iPhone**, because the two failure modes that matter can't be reproduced in a desktop tab: lock the phone mid-round and unlock it, confirming it rejoins the live round with correct state; and leave it untouched for two minutes during a round to confirm the wake lock holds and the screen never sleeps. Two Arena-specific checks that are easy to skip and painful to get wrong: confirm the TV view is legible from across a room at actual TV distance (font sizes that look fine on a laptop are unreadable at three metres), and confirm no Arena screen ever leaks secret state — spymaster keys, spy identity, unrevealed answers. Then set the unlock two minutes ahead to watch the transition fire for real, test the bypass code, and reset to 13:00. Confirm the keep-alive cron has run so Supabase is awake.

**On the day:** Choolwe opens `/tv` on the laptop, everyone else scans the QR.

---

## Timeline

| When | What |
|---|---|
| **Sun 9 Aug (today)** | Build + deploy Stage 1, send the link to the group |
| **Mon–Tue 10–11 Aug** | Answers come in; Choolwe nudges stragglers. Meanwhile I build the engine + the standalone games, which need nobody |
| **Tue 11 Aug** | Pull responses, sort the escalation tiers, design their invented rounds — printing nothing |
| **Wed–Fri 12–14 Aug** | Personalized games + their rounds; six-tab dress rehearsal Friday night |
| **Sat 15 Aug 13:00** | Countdown hits zero |

## Assumptions
- Unlock set to **13:00 Sat 15 Aug 2026**; it's a one-line config change if that moves.
- Venue details stay as placeholders until Choolwe fills in `src/config/event.ts`.
- All six are on iPhones, so the app targets WebKit only and is tested on a real device. Nothing is Safari-*exclusive* — it would still run on Android — but nothing is verified there either.
- The Arena assumes a laptop can reach the TV (HDMI or AirPlay). If it can't, the Huddle and the Vault carry the day on their own.
