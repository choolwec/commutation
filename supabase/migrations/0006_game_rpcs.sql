-- ============================================================================
-- COMMUTATION — 0006: everything the clients are allowed to do
-- ============================================================================
-- 0005 gave the game tables RLS with SELECT policies and no write policies at
-- all. This file is the reason that works: every mutation is a SECURITY
-- DEFINER function that checks who's asking before it does anything.
--
-- The pattern from 0004 (save_answer) proved itself and is reused here: one
-- explicit authorisation check inside a function beats four RLS policies that
-- all have to agree with each other. 0003 is the cautionary tale — policies
-- can silently fail to apply, and a function raising an exception cannot.
--
-- THE ONE FUNCTION TO READ CAREFULLY is deal_from_survey(). It is the only
-- place in the entire system where sealed survey content crosses out of
-- survey_responses, and it is written so that authorship never travels with
-- the text.
-- ============================================================================


-- ─── AUTHORISATION HELPERS ──────────────────────────────────────────────────

create or replace function public.is_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_room r
     where r.id = 'commutation'
       and r.host_player = public.my_player_id()
  );
$$;

grant execute on function public.is_host() to authenticated;


-- Raises rather than returns false: every caller's correct response to "not
-- the host" is to stop, so making it impossible to ignore is the right shape.
create or replace function public.assert_host()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.my_player_id() is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;
  if not public.is_host() then
    raise exception 'only the host can do that' using errcode = '42501';
  end if;
end;
$$;


create or replace function public.room_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_room r
     where r.id = 'commutation'
       and r.unlocked_at is not null
       and r.unlocked_at <= now()
  );
$$;

grant execute on function public.room_is_open() to authenticated;


-- ─── UNLOCKING THE DAY ──────────────────────────────────────────────────────
-- Two ways in, both landing on the same shared timestamp so all six phones
-- and the TV agree about whether the day has started.

-- 1. The countdown reaching zero. Any player's device can call this; it
--    checks the server's clock, not the caller's, so a phone with the wrong
--    date set can't open the Vault early.
create or replace function public.open_room_if_due(p_due timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_player_id() is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  if now() < p_due then
    return false;
  end if;

  update public.game_room
     set unlocked_at = coalesce(unlocked_at, now()),
         updated_at  = now()
   where id = 'commutation';

  return true;
end;
$$;

grant execute on function public.open_room_if_due(timestamptz) to authenticated;


-- 2. The bypass code, for when plans shift.
--
--    The code is compared here, inside the database. It is NOT in the app
--    bundle and NOT in the repo, which matters because the repo is public —
--    a bypass code committed to a public GitHub repo is a bypass code
--    everybody has. room_secrets has RLS on and no SELECT policy, so the
--    only thing that can read the value is this function.
--
--    Set it with (in the SQL editor, not in a file you commit):
--      insert into room_secrets (key, value) values ('bypass_code', 'xxx')
--        on conflict (key) do update set value = excluded.value;
create or replace function public.unlock_with_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
begin
  if public.my_player_id() is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select value into expected
    from public.room_secrets where key = 'bypass_code';

  -- No code configured means no bypass. Fails closed.
  if expected is null or btrim(expected) = '' then
    return false;
  end if;

  if p_code is distinct from expected then
    return false;
  end if;

  update public.game_room
     set unlocked_at = coalesce(unlocked_at, now()),
         updated_at  = now()
   where id = 'commutation';

  return true;
end;
$$;

grant execute on function public.unlock_with_code(text) to authenticated;


-- ─── ROOM CONTROL ───────────────────────────────────────────────────────────

-- Host transfer. Any claimed player may take the host seat — this is six
-- friends in a room, not a system with an admin, and the realistic failure
-- is Choolwe's phone dying mid-day with nobody able to advance a round.
create or replace function public.take_host()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := public.my_player_id();
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  update public.game_room
     set host_player = me, updated_at = now()
   where id = 'commutation';
end;
$$;

grant execute on function public.take_host() to authenticated;


-- The TV heartbeat. The hub greys out the Arena unless this is recent, so
-- nobody launches a game that needs a screen the room hasn't got.
create or replace function public.tv_ping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.game_room
     set tv_seen_at = now(), updated_at = now()
   where id = 'commutation';
end;
$$;

grant execute on function public.tv_ping() to anon, authenticated;


-- ─── DEALING SEALED CONTENT INTO A ROUND ────────────────────────────────────
-- The boundary crossing. Everything else in this file just moves game state
-- around; this is the only function that reads survey_responses.
--
-- How it keeps the promise:
--   · It never returns content to the caller. It writes rows and returns a
--     count. The host's phone learns "6 confessions dealt", not what they say.
--   · Text goes to round_items (readable), authorship goes to round_secrets
--     (sealed until the reveal). They are written in the same transaction but
--     land in tables with different RLS.
--   · source_id excludes anything already played, so a seven-hour day never
--     serves the same confession twice.
--   · Selection is random and server-side. Nobody — including whoever's
--     hosting — chooses which confession comes up.
create or replace function public.deal_from_survey(
  p_round_id     uuid,
  p_question_ids text[],
  p_limit        integer,
  p_exclude_game text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  dealt integer := 0;
  rec   record;
begin
  for rec in
    select r.id, r.player_id, r.value
      from public.survey_responses r
     where r.question_id = any(p_question_ids)
       and length(btrim(r.value)) > 0
       -- Not already used by this game in an earlier round.
       and not exists (
             select 1
               from public.round_items ri
               join public.rounds rd on rd.id = ri.round_id
              where ri.source_id = r.id
                and (p_exclude_game is null or rd.game = p_exclude_game)
           )
     order by random()
     limit p_limit
  loop
    with item as (
      insert into public.round_items
        (round_id, idx, kind, content, source_id)
      values
        (p_round_id, dealt, 'survey', rec.value, rec.id)
      returning id
    )
    insert into public.round_secrets (round_id, item_id, idx, author)
    select p_round_id, item.id, dealt, rec.player_id from item;

    dealt := dealt + 1;
  end loop;

  return dealt;
end;
$$;

-- Not granted to anyone. Callable only from start_round() below, which runs
-- as definer itself. There is no path from a client to this function.
revoke all on function public.deal_from_survey(uuid, text[], integer, text)
  from public, anon, authenticated;


-- ─── STARTING A ROUND ───────────────────────────────────────────────────────
-- Host-only. Deals content, closes whatever was running, and points the room
-- at the new round so all seven screens follow.
create or replace function public.start_round(
  p_game         text,
  p_hall         text,
  p_question_ids text[] default null,
  p_items        integer default 6,
  p_subject      text default null,
  p_config       jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  dealt  integer := 0;
begin
  perform public.assert_host();

  -- The Vault runs on sealed answers, so it stays shut until the day opens
  -- for real. Enforced here and not only in the UI: the countdown is a
  -- promise to the six people who wrote those confessions.
  if p_hall = 'vault' and not public.room_is_open() then
    raise exception 'the vault is sealed until the day' using errcode = '42501';
  end if;

  -- One round at a time. Anything still open is archived rather than
  -- deleted — the scores it awarded stay traceable in the ledger.
  update public.rounds
     set phase = 'done', ended_at = now()
   where phase <> 'done';

  insert into public.rounds (game, hall, subject, config)
  values (p_game, p_hall, p_subject, coalesce(p_config, '{}'::jsonb))
  returning id into new_id;

  if p_question_ids is not null and array_length(p_question_ids, 1) > 0 then
    dealt := public.deal_from_survey(new_id, p_question_ids, p_items, p_game);

    -- Refusing to start beats starting an empty round and discovering it on
    -- the big screen. The host gets a real message and picks another game.
    if dealt = 0 then
      delete from public.rounds where id = new_id;
      raise exception 'nothing left to play for %', p_game
        using errcode = 'P0002';
    end if;
  end if;

  update public.game_room
     set active_round = new_id, updated_at = now()
   where id = 'commutation';

  return new_id;
end;
$$;

grant execute on function
  public.start_round(text, text, text[], integer, text, jsonb)
  to authenticated;


-- ─── ADVANCING A ROUND ──────────────────────────────────────────────────────

create or replace function public.set_phase(p_round uuid, p_phase text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_host();

  update public.rounds
     set phase    = p_phase,
         started_at = now(),
         ended_at = case when p_phase = 'done' then now() else ended_at end,
         -- Reaching the reveal opens submissions and votes together. Games
         -- that need them opened separately (Drawful) call set_reveal below.
         show_submissions = show_submissions or p_phase in ('reveal','done'),
         show_votes       = show_votes       or p_phase in ('reveal','done')
   where id = p_round;
end;
$$;

grant execute on function public.set_phase(uuid, text) to authenticated;


create or replace function public.set_reveal(
  p_round uuid,
  p_submissions boolean,
  p_votes boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_host();

  update public.rounds
     set show_submissions = p_submissions,
         show_votes = p_votes
   where id = p_round;
end;
$$;

grant execute on function public.set_reveal(uuid, boolean, boolean)
  to authenticated;


-- Moves a multi-item round to the next confession/prompt without re-dealing.
-- Resets the reveal flags so item 2 doesn't open already-answered.
create or replace function public.set_cursor(p_round uuid, p_cursor integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_host();

  update public.rounds
     set item_cursor = p_cursor,
         phase = 'play',
         started_at = now(),
         show_submissions = false,
         show_votes = false
   where id = p_round;
end;
$$;

grant execute on function public.set_cursor(uuid, integer) to authenticated;


-- ─── PLAYING ────────────────────────────────────────────────────────────────
-- Anyone holding a profile. Writes are always attributed to the caller's own
-- player id, taken from the session — never from an argument — so nobody can
-- submit or vote as somebody else.

create or replace function public.submit_answer(
  p_round uuid,
  p_idx   integer,
  p_kind  text,
  p_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := public.my_player_id();
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.rounds where id = p_round and phase in ('play','vote')
  ) then
    raise exception 'that round is not accepting answers' using errcode = '42501';
  end if;

  insert into public.submissions (round_id, player_id, idx, kind, value)
  values (p_round, me, p_idx, coalesce(p_kind,'answer'), p_value)
  on conflict (round_id, player_id, idx, kind)
    do update set value = excluded.value, created_at = now();
end;
$$;

grant execute on function public.submit_answer(uuid, integer, text, text)
  to authenticated;


create or replace function public.cast_vote(
  p_round uuid,
  p_idx   integer,
  p_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := public.my_player_id();
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.rounds where id = p_round and phase in ('play','vote')
  ) then
    raise exception 'voting is closed' using errcode = '42501';
  end if;

  -- Changing your mind is allowed right up until the host closes voting.
  insert into public.votes (round_id, player_id, idx, value)
  values (p_round, me, p_idx, p_value)
  on conflict (round_id, player_id, idx)
    do update set value = excluded.value, created_at = now();
end;
$$;

grant execute on function public.cast_vote(uuid, integer, text) to authenticated;


-- ─── SCORING ────────────────────────────────────────────────────────────────
-- Server-side, from the sealed secrets, so the phone doing the scoring never
-- needs to know the answer. Idempotent per (round, item): re-running after a
-- dropped connection can't double-pay.

create or replace function public.score_item(p_round uuid, p_idx integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  truth    text;
  -- Named v_ rather than `reason` on purpose: a variable sharing a column's
  -- name makes `where reason = reason` a self-comparison that matches every
  -- row, which would make the idempotency guard below silently always true.
  v_reason text := 'round:' || p_round::text || ':' || p_idx::text;
  fooled   integer;
begin
  perform public.assert_host();

  if exists (select 1 from public.scores s where s.reason = v_reason) then
    return;
  end if;

  select s.author into truth
    from public.round_secrets s
   where s.round_id = p_round and s.idx = p_idx;

  if truth is null then
    return;
  end if;

  -- Guessed the author.
  insert into public.scores (round_id, player_id, points, reason)
  select p_round, v.player_id, 100, v_reason
    from public.votes v
   where v.round_id = p_round and v.idx = p_idx and v.value = truth;

  -- Stayed hidden: 50 a head for everyone who guessed wrong. Voting for
  -- yourself to farm this is possible and entirely in the spirit of it.
  select count(*) into fooled
    from public.votes v
   where v.round_id = p_round and v.idx = p_idx and v.value <> truth;

  if fooled > 0 then
    insert into public.scores (round_id, player_id, points, reason)
    values (p_round, truth, fooled * 50, v_reason);
  end if;
end;
$$;

grant execute on function public.score_item(uuid, integer) to authenticated;


-- Most Likely To has no correct answer, so the points go to whoever the room
-- actually picked. Ties pay everyone tied.
create or replace function public.score_plurality(p_round uuid, p_idx integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := 'plurality:' || p_round::text || ':' || p_idx::text;
begin
  perform public.assert_host();

  if exists (select 1 from public.scores s where s.reason = v_reason) then
    return;
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  select p_round, v.value, 100, v_reason
    from public.votes v
   where v.round_id = p_round and v.idx = p_idx
   group by v.value
  having count(*) = (
    select max(c) from (
      select count(*) as c from public.votes
       where round_id = p_round and idx = p_idx
       group by value
    ) t
  );
end;
$$;

grant execute on function public.score_plurality(uuid, integer) to authenticated;
