-- ============================================================================
-- COMMUTATION — 0014: Chameleon's one guess for partial credit
-- ============================================================================
-- The real board game: a caught Chameleon gets one guess at the secret word
-- — name it correctly and they still score, just less than surviving the
-- vote outright. score_odd_one_out() (0007) already computes caught/
-- survived and pays a surviving Chameleon 250; this adds the partial-credit
-- path for a caught one.
--
-- Why an RPC and not just a client-side reveal gate: round_secrets opens to
-- everyone (RLS) the instant phase hits 'reveal', so by the time the room
-- can see anything, the client ALSO already has the real word in memory —
-- there's no way to structurally keep it from the Chameleon's own device at
-- that point (same accepted trust level as Fibbage/Trivia's answer keys
-- shipping in the bundle, see HANDOFF §12). What this RPC actually protects
-- is the SCORE: "caught" has to be recomputed server-side from votes rather
-- than trusted from the client, or a chameleon who actually survived (and
-- already banked 250) could falsely claim "I was caught" and farm another
-- 100 on top. One guess per round per player, enforced by an idempotency
-- check on the score reason, same pattern as score_item()'s v_reason guard.
-- ============================================================================

create or replace function public.award_chameleon_guess(p_round uuid, p_guess text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me        text := public.my_player_id();
  r_game    text;
  chameleon text;
  word      text;
  caught    integer;
  total     integer;
  v_reason  text := 'chameleon_partial:' || p_round::text;
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select game into r_game from public.rounds where id = p_round;
  if r_game is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if r_game <> 'chameleon' then
    raise exception 'award_chameleon_guess is only for chameleon' using errcode = '42501';
  end if;

  select author, payload->>'shared' into chameleon, word
    from public.round_secrets
   where round_id = p_round and idx = 0
   limit 1;

  if chameleon is null or chameleon <> me then
    raise exception 'only the chameleon gets a guess' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.scores
     where round_id = p_round and player_id = me and reason = v_reason
  ) then
    raise exception 'already used your one guess' using errcode = 'P0002';
  end if;

  select count(*) into caught
    from public.votes v
   where v.round_id = p_round and v.idx = 0 and v.value = chameleon;
  select count(*) into total
    from public.votes where round_id = p_round and idx = 0;

  -- Survived the vote (same condition score_odd_one_out already paid 250
  -- for) — no guess needed, and no double-dipping.
  if caught * 2 <= total then
    raise exception 'you survived the vote — no guess needed' using errcode = 'P0002';
  end if;

  -- One shot either way: record it used even on a wrong guess.
  if lower(trim(p_guess)) = lower(trim(coalesce(word, ''))) then
    insert into public.scores (round_id, player_id, points, reason)
    values (p_round, me, 100, v_reason);
    return true;
  else
    insert into public.scores (round_id, player_id, points, reason)
    values (p_round, me, 0, v_reason);
    return false;
  end if;
end;
$$;

grant execute on function public.award_chameleon_guess(uuid, text) to authenticated;
