-- ============================================================================
-- COMMUTATION — 0011: a way to test games without touching real content
-- ============================================================================
-- Choolwe asked to be able to test-play games on his own phone before
-- Saturday. Two things stand in the way, both deliberate:
--
--   1. start_round() refuses to open a Vault game before the day unlocks —
--      correct, and this migration does NOT weaken that for real content.
--   2. Five games (who_wrote_it, know_me_best, the_deep_end, most_likely_to,
--      best_answer) read REAL sealed survey answers in their normal start().
--      Test-playing those for real would mean Choolwe reading confessions
--      early — exactly what HANDOFF §2 promises never happens. "It's just a
--      test" doesn't change that a real confession got read by someone
--      before the day.
--
-- So: a test round is its own thing. `is_test` marks it, so cleanup is one
-- delete (cascades through everything, including the points it awarded —
-- test play must never leak into the real Saturday leaderboard). And
-- deal_test_pair() lets the client supply FAKE content directly — it never
-- reads survey_responses, so there is nothing in it that could leak.
-- ============================================================================

alter table public.rounds add column if not exists is_test boolean not null default false;


drop function if exists public.start_round(text, text, text[], integer, text, jsonb);
create or replace function public.start_round(
  p_game         text,
  p_hall         text,
  p_question_ids text[] default null,
  p_items        integer default 6,
  p_subject      text default null,
  p_config       jsonb default '{}'::jsonb,
  p_test         boolean default false
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

  -- Real Vault content still refuses to open early — a test round doesn't
  -- get an exception, it just isn't dealt from survey_responses at all
  -- (test rounds are built with deal_test_pair, which never reads it).
  if p_hall = 'vault' and not p_test and not public.room_is_open() then
    raise exception 'the vault is sealed until the day' using errcode = '42501';
  end if;

  update public.rounds
     set phase = 'done', ended_at = now()
   where phase <> 'done';

  insert into public.rounds (game, hall, subject, config, is_test)
  values (p_game, p_hall, p_subject, coalesce(p_config, '{}'::jsonb), p_test)
  returning id into new_id;

  if not p_test and p_question_ids is not null and array_length(p_question_ids, 1) > 0 then
    dealt := public.deal_from_survey(new_id, p_question_ids, p_items, p_game);
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
  public.start_round(text, text, text[], integer, text, jsonb, boolean)
  to authenticated;


drop function if exists public.start_deck_round(text, text, text, jsonb);
create or replace function public.start_deck_round(
  p_game    text,
  p_hall    text,
  p_subject text default null,
  p_config  jsonb default '{}'::jsonb,
  p_test    boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform public.assert_host();

  update public.rounds
     set phase = 'done', ended_at = now()
   where phase <> 'done';

  insert into public.rounds (game, hall, subject, config, is_test)
  values (p_game, p_hall, p_subject, coalesce(p_config, '{}'::jsonb), p_test)
  returning id into new_id;

  update public.game_room
     set active_round = new_id, updated_at = now()
   where id = 'commutation';

  return new_id;
end;
$$;

grant execute on function public.start_deck_round(text, text, text, jsonb, boolean)
  to authenticated;


-- ─── FAKE CONTENT, FOR TESTING ONLY ─────────────────────────────────────────
-- Takes whatever text the CLIENT supplies — never reads survey_responses.
-- That's the whole safety property: it is structurally incapable of leaking
-- real content, because real content never enters it in the first place.
-- `author` still has to be a real crew id (round_secrets.author references
-- players), which is fine — attributing an obviously-fake test line to a
-- real name is harmless and never seen by anyone but the tester.
create or replace function public.deal_test_pair(
  p_round   uuid,
  p_idx     integer,
  p_content text,
  p_author  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_item uuid;
begin
  perform public.assert_host();

  if not exists (select 1 from public.rounds where id = p_round and is_test) then
    raise exception 'deal_test_pair only works on a test round' using errcode = '42501';
  end if;

  insert into public.round_items (round_id, idx, kind, content)
  values (p_round, p_idx, 'survey', p_content)
  returning id into new_item;

  if p_author is not null then
    insert into public.round_secrets (round_id, item_id, idx, author)
    values (p_round, new_item, p_idx, p_author)
    on conflict do nothing;
  end if;
end;
$$;

grant execute on function public.deal_test_pair(uuid, integer, text, text)
  to authenticated;


-- Same idea as deal_test_pair, for Know Me Best's shape specifically
-- (public prompt, sealed fake "real answer").
create or replace function public.deal_test_hidden(
  p_round   uuid,
  p_idx     integer,
  p_subject text,
  p_prompt  text,
  p_answer  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_item uuid;
begin
  perform public.assert_host();

  if not exists (select 1 from public.rounds where id = p_round and is_test) then
    raise exception 'deal_test_hidden only works on a test round' using errcode = '42501';
  end if;

  insert into public.round_items (round_id, idx, kind, content)
  values (p_round, p_idx, 'prompt', p_prompt)
  returning id into new_item;

  insert into public.round_secrets (round_id, item_id, idx, author, payload)
  values (p_round, new_item, p_idx, p_subject, jsonb_build_object('value', p_answer))
  on conflict do nothing;
end;
$$;

grant execute on function public.deal_test_hidden(uuid, integer, text, text, text)
  to authenticated;


-- One call, wipes every trace of test play — items, secrets, submissions,
-- votes, and critically the points, all cascade off `rounds`. Real Saturday
-- data is untouched: nothing here can match a row where is_test is false.
create or replace function public.clear_test_rounds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  perform public.assert_host();
  delete from public.rounds where is_test;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.clear_test_rounds() to authenticated;
