-- ============================================================================
-- COMMUTATION — 0009: the pass economy
-- ============================================================================
-- PLAN.md: Truth or Dare runs with "2 passes each for the whole day, each
-- visibly costing leaderboard points." Self-service, unlike everything else
-- that touches `scores` — a player using their own pass shouldn't need the
-- host to approve it, so this checks the caller's own history and inserts
-- for themselves, rather than going through host-gated award_points().
-- ============================================================================

create or replace function public.use_pass(p_round uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me   text := public.my_player_id();
  used integer;
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select count(*) into used
    from public.scores
   where player_id = me and reason = 'pass';

  if used >= 2 then
    raise exception 'no passes left today' using errcode = 'P0002';
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  values (p_round, me, -25, 'pass');

  return 2 - (used + 1);
end;
$$;

grant execute on function public.use_pass(uuid) to authenticated;
