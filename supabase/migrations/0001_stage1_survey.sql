-- ============================================================================
-- COMMUTATION — Stage 1: profiles + the sealed survey
-- ============================================================================
-- The one rule this file exists to enforce: nobody can read anybody else's
-- survey answers. Not other players, not the host, not through the API.
-- Answers are readable only by their author until the day, when the game
-- engine releases them server-side with the service role.
--
-- Everything is keyed to auth.uid() from Supabase anonymous auth, so a
-- device's identity survives refreshes without anyone typing a password.
-- ============================================================================


-- ─── PLAYERS ────────────────────────────────────────────────────────────────
-- One row per crew member, pre-seeded. A person "claims" their row on first
-- open, which binds it to their anonymous auth uid.

create table if not exists public.players (
  id            text primary key,              -- matches src/config/crew.ts ids
  name          text not null,
  emoji         text not null default '🙂',
  color         text not null default '#888888',
  hype_word     text,
  trash_talk    text,

  claimed_by    uuid references auth.users(id) on delete set null,
  claimed_at    timestamptz,

  -- Maintained by trigger. Lets the hub show "4/6 done" WITHOUT exposing
  -- a single character of anyone's actual answers.
  answers_count integer not null default 0,
  submitted_at  timestamptz,

  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.players enable row level security;

-- Everyone can see the roster: names, avatars, and how many questions each
-- person has answered. This is deliberate — it's the social pressure.
drop policy if exists "players are visible to all" on public.players;
create policy "players are visible to all"
  on public.players for select
  using (true);

-- You may claim an unclaimed profile, and thereafter only edit your own.
drop policy if exists "claim or update own profile" on public.players;
create policy "claim or update own profile"
  on public.players for update
  to authenticated
  using (claimed_by is null or claimed_by = auth.uid())
  with check (claimed_by = auth.uid());


-- ─── SURVEY RESPONSES ───────────────────────────────────────────────────────
-- One row per answer. `answer_index` supports repeatable questions (write 3
-- confessions and you get 3 rows with the same question_id).

create table if not exists public.survey_responses (
  id            uuid primary key default gen_random_uuid(),
  player_id     text not null references public.players(id) on delete cascade,
  author        uuid not null default auth.uid() references auth.users(id) on delete cascade,

  section_id    text not null,
  question_id   text not null,
  answer_index  integer not null default 0,
  value         text not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (player_id, question_id, answer_index)
);

alter table public.survey_responses enable row level security;

-- THE important policy. Four separate ones rather than `for all`, so that a
-- future mistake in one verb can't silently widen the others.

drop policy if exists "read only your own answers" on public.survey_responses;
create policy "read only your own answers"
  on public.survey_responses for select
  to authenticated
  using (author = auth.uid());

drop policy if exists "write only your own answers" on public.survey_responses;
create policy "write only your own answers"
  on public.survey_responses for insert
  to authenticated
  with check (
    author = auth.uid()
    and exists (
      select 1 from public.players p
      where p.id = player_id and p.claimed_by = auth.uid()
    )
  );

drop policy if exists "update only your own answers" on public.survey_responses;
create policy "update only your own answers"
  on public.survey_responses for update
  to authenticated
  using (author = auth.uid())
  with check (author = auth.uid());

drop policy if exists "delete only your own answers" on public.survey_responses;
create policy "delete only your own answers"
  on public.survey_responses for delete
  to authenticated
  using (author = auth.uid());


-- ─── PROGRESS TRIGGER ───────────────────────────────────────────────────────
-- Keeps players.answers_count in step. Runs as SECURITY DEFINER so it can
-- count rows the calling user isn't allowed to read — the count leaks nothing,
-- the content never leaves this function.

create or replace function public.refresh_answer_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.player_id, old.player_id);
begin
  update public.players p
     set answers_count = (
           select count(*) from public.survey_responses r
            where r.player_id = target
              and length(btrim(r.value)) > 0
         )
   where p.id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_answer_count on public.survey_responses;
create trigger trg_refresh_answer_count
  after insert or update or delete on public.survey_responses
  for each row execute function public.refresh_answer_count();


-- ─── TOUCH updated_at ───────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_survey on public.survey_responses;
create trigger trg_touch_survey
  before update on public.survey_responses
  for each row execute function public.touch_updated_at();


-- ─── SEED THE CREW ──────────────────────────────────────────────────────────
-- Mirrors src/config/crew.ts. Safe to re-run: won't clobber claimed profiles.

insert into public.players (id, name, emoji, color, sort_order) values
  ('choolwe',   'Choolwe',   '👑', '#f59e0b', 1),
  ('chileleko', 'Chileleko', '🔥', '#ef4444', 2),
  ('joy',       'Joy',       '✨', '#a855f7', 3),
  ('latasha',   'Latasha',   '🦋', '#06b6d4', 4),
  ('niza',      'Niza',      '🌙', '#6366f1', 5),
  ('chibesa',   'Chibesa',   '⚡', '#10b981', 6)
on conflict (id) do nothing;
