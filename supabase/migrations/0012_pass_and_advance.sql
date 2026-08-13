-- ============================================================================
-- COMMUTATION — 0012: make Pass actually pass
-- ============================================================================
-- Bug: Truth or Dare's Pass button called use_pass() (0009), which deducts
-- 25 points and stops — it never advances item_cursor, so the same card
-- just sits there after paying for it. The reason the client couldn't just
-- also call set_cursor() (0006) is that set_cursor is assert_host()-gated,
-- so a client-side fix would only work when the person tapping Pass happens
-- to be the host.
--
-- Fix: one self-service RPC that does what use_pass() does *and* performs
-- the same cursor-advance/finish logic set_cursor()/set_phase() do, without
-- an assert_host() check — mirroring use_pass()'s own reasoning (0009's
-- header: a player spending their own pass doesn't need the host). Scoped
-- to truth_or_dare rounds only, so this doesn't become a general "any
-- player can advance any round" backdoor for other games.
-- ============================================================================

create or replace function public.pass_and_advance(p_round uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me      text := public.my_player_id();
  used    integer;
  r_game  text;
  cur     integer;
  total   integer;
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select game, item_cursor into r_game, cur
    from public.rounds
   where id = p_round;

  if r_game is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if r_game <> 'truth_or_dare' then
    raise exception 'pass_and_advance is only for truth_or_dare' using errcode = '42501';
  end if;

  select count(*) into used
    from public.scores
   where player_id = me and reason = 'pass';

  if used >= 2 then
    raise exception 'no passes left today' using errcode = 'P0002';
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  values (p_round, me, -25, 'pass');

  select count(distinct idx) into total
    from public.round_items
   where round_id = p_round;

  if cur >= total - 1 then
    update public.rounds
       set phase = 'done',
           ended_at = now()
     where id = p_round;
  else
    update public.rounds
       set item_cursor = cur + 1,
           phase = 'play',
           started_at = now(),
           show_submissions = false,
           show_votes = false
     where id = p_round;
  end if;

  return 2 - (used + 1);
end;
$$;

grant execute on function public.pass_and_advance(uuid) to authenticated;
