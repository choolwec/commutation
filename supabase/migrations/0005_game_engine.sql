-- ============================================================================
-- COMMUTATION — 0005: the Stage 2 game engine
-- ============================================================================
-- The app is a static export: there is no server anywhere in production. So
-- every rule that matters is a Postgres rule. "The host controls the round",
-- "you can't see other people's votes yet", "nobody learns who wrote that
-- confession until the reveal" — none of these can live in React, because
-- React runs on the phone of the person they're being enforced against.
--
-- THE CARRY-OVER RULE FROM STAGE 1, restated for the engine:
--   Survey answers stay sealed to their author. The ONLY way content leaves
--   survey_responses is a SECURITY DEFINER deal function copying exactly the
--   fields one live round needs into round_items — and authorship never
--   travels with it. It goes into round_secrets, which stays unreadable until
--   the round's phase says otherwise.
--
-- Read 0006 alongside this file: this one is tables and RLS, that one is the
-- functions that are allowed to cross the boundaries drawn here.
-- ============================================================================


-- ─── WHO AM I ───────────────────────────────────────────────────────────────
-- Every policy below is written in terms of "my player id", not auth.uid(),
-- because game state is keyed to the crew profile (text id) rather than the
-- device session. Marked STABLE so Postgres calls it once per statement
-- instead of once per row.

create or replace function public.my_player_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.players p where p.claimed_by = auth.uid();
$$;

grant execute on function public.my_player_id() to authenticated;


-- ─── THE ROOM ───────────────────────────────────────────────────────────────
-- Exactly one row, forever. Holds the two pieces of state that outlive any
-- single round: who's hosting, and whether the day has started.

create table if not exists public.game_room (
  id            text primary key default 'commutation',

  -- Defaults to Choolwe, transferable mid-day if his phone dies.
  host_player   text references public.players(id) on delete set null,

  -- Null until the day opens. Set either by the countdown reaching zero or
  -- by the bypass code. Deliberately a shared timestamp rather than each
  -- phone checking its own clock: six phones disagreeing about whether the
  -- games have started is a real failure mode, and one of them is always
  -- set to the wrong timezone.
  unlocked_at   timestamptz,

  -- The round everyone's screen should currently be showing.
  active_round  uuid,

  -- TV mode presence. The hub greys out the Arena until this is fresh, so
  -- nobody launches a game the room physically cannot play.
  tv_seen_at    timestamptz,

  updated_at    timestamptz not null default now(),

  constraint game_room_singleton check (id = 'commutation')
);

alter table public.game_room enable row level security;

drop policy if exists "room is visible to all" on public.game_room;
create policy "room is visible to all"
  on public.game_room for select
  using (true);

-- No INSERT/UPDATE/DELETE policy on purpose. Every write goes through a
-- SECURITY DEFINER function in 0006 that checks host-ness first. A player
-- cannot promote themselves by calling the REST API directly.

insert into public.game_room (id, host_player) values ('commutation', 'choolwe')
  on conflict (id) do nothing;


-- ─── ROOM SECRETS ───────────────────────────────────────────────────────────
-- The bypass code, and anything else that must never appear in the public
-- repo. This table has RLS on and NO select policy at all, which means it is
-- unreadable through the anon key by construction — the only thing that can
-- see it is a SECURITY DEFINER function.
--
-- Why this exists: the repo is public (GitHub Pages, free tier). A bypass
-- code hardcoded in src/config/event.ts is readable by anyone who opens the
-- source, which makes it not a secret. Now the code lives only here.

create table if not exists public.room_secrets (
  key    text primary key,
  value  text not null
);

alter table public.room_secrets enable row level security;
-- Intentionally zero policies. Do not add one.


-- ─── ROUNDS ─────────────────────────────────────────────────────────────────
-- One row per playthrough of one game. The phase column is the clock every
-- screen in the building reads from.

create table if not exists public.rounds (
  id           uuid primary key default gen_random_uuid(),

  -- Matches a GameModule id in src/games/registry.ts.
  game         text not null,
  hall         text not null check (hall in ('vault', 'huddle', 'arena')),

  -- lobby   — dealt, waiting for the host to start
  -- play    — accepting submissions
  -- vote    — accepting votes
  -- reveal  — secrets open, scores computed
  -- done    — archived, no longer active
  phase        text not null default 'lobby'
               check (phase in ('lobby','play','vote','reveal','done')),

  -- Games like Know Me Best and Hot Seat revolve around one person.
  subject      text references public.players(id) on delete set null,

  -- Per-game knobs (timer length, deck tier, item count). Never content.
  config       jsonb not null default '{}'::jsonb,

  -- Which item of a multi-item round is on screen. Lets one round hold six
  -- confessions and walk through them without re-dealing. Named item_cursor
  -- rather than `cursor`, which is a PL/pgSQL keyword and would need quoting
  -- in every function that touches it.
  item_cursor  integer not null default 0,

  -- Deliberately explicit rather than derived from `phase`. Drawful needs
  -- drawings visible while a later writing step is still open, so "what's
  -- revealed" and "what phase are we in" have to move independently.
  show_submissions boolean not null default false,
  show_votes       boolean not null default false,

  -- When the current phase's clock started. Six phones each running their
  -- own setTimeout would drift apart within a round and disagree about who
  -- ran out of time; everyone counting down to the same server timestamp
  -- cannot. Reset by set_phase() and set_cursor().
  started_at   timestamptz,

  created_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create index if not exists rounds_active_idx on public.rounds (created_at desc);

alter table public.rounds enable row level security;

drop policy if exists "rounds are visible to all" on public.rounds;
create policy "rounds are visible to all"
  on public.rounds for select
  using (true);

-- Writes are host-only, via 0006. No policy here.


-- ─── ROUND ITEMS ────────────────────────────────────────────────────────────
-- The content a round is played on: a confession to guess the author of, a
-- Most Likely To prompt, a Spyfall role. Written ONLY by deal functions in
-- 0006 — never by a client.

create table if not exists public.round_items (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  idx         integer not null,

  kind        text not null,
  content     text not null,

  -- Null means everyone sees it. A player id means this item is dealt to
  -- exactly one phone — Paranoia's question, Spyfall's "you're the spy",
  -- a Codenames spymaster key. This is the whole reason phones beat paper.
  visible_to  text references public.players(id) on delete cascade,

  -- Extra per-item payload the game needs but that isn't the visible text
  -- (e.g. a Hot Takes target position). Never authorship — that's a secret.
  meta        jsonb not null default '{}'::jsonb,

  -- Which survey answer this was dealt from, so the same confession never
  -- comes up twice across a seven-hour day. Safe to expose: it's an opaque
  -- uuid, and survey_responses stays author-scoped regardless of who holds
  -- the id.
  source_id   uuid references public.survey_responses(id) on delete set null,

  unique (round_id, idx, kind, visible_to)
);

create index if not exists round_items_round_idx
  on public.round_items (round_id, idx);

alter table public.round_items enable row level security;

-- The privacy-bearing read policy. A privately-dealt item is invisible to
-- everyone else at the database level, so "don't peek" is not something we
-- ask of anyone — the row simply isn't in their result set.
drop policy if exists "items are visible when dealt to you" on public.round_items;
create policy "items are visible when dealt to you"
  on public.round_items for select
  to authenticated
  using (
    visible_to is null
    or visible_to = public.my_player_id()
  );


-- ─── ROUND SECRETS ──────────────────────────────────────────────────────────
-- THE table that makes Who Wrote It? work.
--
-- A confession's text goes in round_items where everyone can read it. The
-- name of who wrote it goes here, and this table refuses to answer until the
-- round reaches the reveal. Separate table rather than a column on
-- round_items because Postgres RLS filters rows, not columns — a nullable
-- `author` column on a visible row would be readable the moment the item is,
-- which is the entire thing we're preventing.

create table if not exists public.round_secrets (
  id        uuid primary key default gen_random_uuid(),
  round_id  uuid not null references public.rounds(id) on delete cascade,

  -- The item this is the answer to. Nullable, and paired with idx, because
  -- some secrets belong to the round rather than to a visible item: in
  -- Spyfall the thing to hide is "who got the spy card", and that card is a
  -- privately-dealt row nobody else can see, so there is no shared item to
  -- hang the secret off.
  item_id   uuid references public.round_items(id) on delete cascade,
  idx       integer not null default 0,

  -- Who wrote it / who the spy is. The answer to the round.
  author    text references public.players(id) on delete set null,

  -- Anything else sealed until the reveal (the true Fibbage answer, the
  -- real position on a Hot Takes spectrum).
  payload   jsonb not null default '{}'::jsonb,

  unique (round_id, idx, author)
);

create index if not exists round_secrets_round_idx
  on public.round_secrets (round_id, idx);

alter table public.round_secrets enable row level security;

-- Readable only once the round has actually reached its reveal. Before that
-- there is no query — from the app, from curl, from the console — that
-- returns the author of a confession.
drop policy if exists "secrets open at the reveal" on public.round_secrets;
create policy "secrets open at the reveal"
  on public.round_secrets for select
  to authenticated
  using (
    exists (
      select 1 from public.rounds r
       where r.id = round_id
         and r.phase in ('reveal', 'done')
    )
  );


-- ─── SUBMISSIONS ────────────────────────────────────────────────────────────
-- What players type, draw, or pick during a round.

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  player_id   text not null references public.players(id) on delete cascade,

  -- Which round_item this answers, for multi-item rounds.
  idx         integer not null default 0,

  kind        text not null default 'answer',
  value       text not null,

  created_at  timestamptz not null default now(),

  unique (round_id, player_id, idx, kind)
);

create index if not exists submissions_round_idx
  on public.submissions (round_id, idx);

alter table public.submissions enable row level security;

-- Your own always; everyone else's only once the host has opened them.
-- Without the second arm, Best Answer and Fibbage are unplayable — you'd be
-- able to read everyone's lie before writing your own.
drop policy if exists "submissions are yours until revealed" on public.submissions;
create policy "submissions are yours until revealed"
  on public.submissions for select
  to authenticated
  using (
    player_id = public.my_player_id()
    or exists (
      select 1 from public.rounds r
       where r.id = round_id and r.show_submissions
    )
  );


-- ─── VOTES ──────────────────────────────────────────────────────────────────

create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  player_id   text not null references public.players(id) on delete cascade,
  idx         integer not null default 0,

  -- A crew id for "who wrote it" / "most likely to", or free text for a
  -- spectrum position. One column keeps every voting game on one primitive.
  value       text not null,

  created_at  timestamptz not null default now(),

  unique (round_id, player_id, idx)
);

create index if not exists votes_round_idx on public.votes (round_id, idx);

alter table public.votes enable row level security;

drop policy if exists "votes are yours until revealed" on public.votes;
create policy "votes are yours until revealed"
  on public.votes for select
  to authenticated
  using (
    player_id = public.my_player_id()
    or exists (
      select 1 from public.rounds r
       where r.id = round_id and r.show_votes
    )
  );


-- ─── SCORES ─────────────────────────────────────────────────────────────────
-- Append-only ledger, not a running total. Every point traceable to the
-- round that awarded it, which is what makes the end-of-day Awards
-- ("Best Liar", "Biggest Coward") computable from real data instead of
-- someone's memory.

create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid references public.rounds(id) on delete cascade,
  player_id   text not null references public.players(id) on delete cascade,

  points      integer not null,
  reason      text not null,

  created_at  timestamptz not null default now()
);

create index if not exists scores_player_idx on public.scores (player_id);

alter table public.scores enable row level security;

-- The leaderboard is the point. Everyone sees everything here.
drop policy if exists "scores are visible to all" on public.scores;
create policy "scores are visible to all"
  on public.scores for select
  using (true);


-- ─── LEADERBOARD ────────────────────────────────────────────────────────────
-- A view so the phones and the TV can't disagree about the standings.

create or replace view public.leaderboard as
  select p.id,
         p.name,
         p.emoji,
         p.color,
         coalesce(sum(s.points), 0)::integer as points
    from public.players p
    left join public.scores s on s.player_id = p.id
   group by p.id, p.name, p.emoji, p.color, p.sort_order
   order by points desc, p.sort_order;

grant select on public.leaderboard to anon, authenticated;


-- ─── REALTIME ───────────────────────────────────────────────────────────────
-- Six phones and a TV move in lockstep off these. postgres_changes rather
-- than broadcast triggers: Supabase applies RLS per subscriber, so a phone
-- is never even sent a row it isn't allowed to see, and at seven clients the
-- performance argument for broadcast doesn't apply.
--
-- Consequence worth knowing: a row that was invisible at insert time
-- generates no event when it later becomes visible. That's why the client
-- refetches round state on any `rounds` change rather than incrementally
-- applying events — the phase flip is the signal to re-read everything.

do $$
begin
  alter publication supabase_realtime add table public.game_room;
  alter publication supabase_realtime add table public.rounds;
  alter publication supabase_realtime add table public.submissions;
  alter publication supabase_realtime add table public.votes;
  alter publication supabase_realtime add table public.scores;
exception
  when duplicate_object then null;
end $$;
