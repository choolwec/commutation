-- ============================================================================
-- COMMUTATION — 0013: let the subject award their own closest guess
-- ============================================================================
-- Know Me Best's "closest guess, tap to award 100" was host-only, via
-- award_points() (0007, assert_host()-gated) — the subject couldn't even
-- see the reveal at all until the client-side visibility bug fixed
-- alongside this migration (index.tsx's isSubject check used to run before
-- the revealed check). But the subject is the one who actually knows the
-- nuance of their own answer, so once they can see the reveal, letting
-- them award is the natural next step.
--
-- Same shape as pass_and_advance() (0012): a narrow self-service RPC that
-- replaces assert_host() with a check that the caller IS the specific
-- person the DB reality requires, scoped to know_me_best rounds only so it
-- can't become a general non-host scoring backdoor. award_points() is left
-- untouched and still works for the host — this adds an option, it doesn't
-- remove the fallback for a subject whose phone is the actual problem.
-- ============================================================================

create or replace function public.award_closest_guess(p_round uuid, p_player text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me     text := public.my_player_id();
  r_game text;
  r_subj text;
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select game, subject into r_game, r_subj
    from public.rounds
   where id = p_round;

  if r_game is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if r_game <> 'know_me_best' then
    raise exception 'award_closest_guess is only for know_me_best' using errcode = '42501';
  end if;
  if r_subj is distinct from me then
    raise exception 'only the person this round is about can award this' using errcode = '42501';
  end if;

  if not exists (select 1 from public.players where id = p_player) then
    raise exception 'no such player %', p_player using errcode = 'P0002';
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  values (p_round, p_player, 100, 'closest_guess');
end;
$$;

grant execute on function public.award_closest_guess(uuid, text) to authenticated;
