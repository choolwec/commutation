-- ============================================================================
-- COMMUTATION — 0016: the filtered forfeit, and Contact's letter reveal
-- ============================================================================
-- The last two of the group's invented rounds that genuinely needed Postgres
-- rather than React (docs/THEIR_ROUNDS.md §2.1 and §2.3).
--
--
-- 1. deal_forfeit() / reroll_forfeit()  —  THEIR_ROUNDS §2.1
--
-- The idea: a Reckless-tier forfeit that names a specific real person in your
-- life to phone, dealt to a random player, with the deck gated so a forfeit
-- that doesn't fit its target is NEVER dealt to them. The spec was explicit
-- that the eligibility condition arrived as part of the original idea, not an
-- afterthought, and should be treated as a hard requirement.
--
-- Two halves, and only one of them landed where the spec expected:
--
--   * WHO gets it — server-side here, as specified. If the host's device
--     picked, the host would be choosing who gets the awkward card, which is
--     exactly the thing deal_roles() (0007) exists to prevent.
--
--   * WHETHER IT FITS — the spec assumed this could be read "from sealed
--     survey data inside the definer function". It can't: src/config/
--     survey.ts has no question that answers it. Nothing in the bank asks
--     about relationship status, siblings, or living parents, and three of
--     the six had already sealed their survey by the time this was built, so
--     adding one wasn't available either.
--
--     The resolution keeps the requirement and moves the check to the only
--     place the answer actually exists — the recipient's own head. Every
--     card carries a `needs` line, it's shown to the one phone the card was
--     dealt to, and that phone can swap it for a different card without
--     anyone learning why. That satisfies §2.1's Q4 resolution exactly
--     ("re-deal, never skip the turn or water down the content") and beats
--     the alternative the spec itself warned against: a public column on
--     `players` would broadcast a private fact to the whole room, which is
--     worse than the problem being solved.
--
-- reroll_forfeit() is therefore self-service, like use_pass()/
-- pass_and_advance() (0009/0012) — and scoped the same way, to
-- truth_or_dare rounds and to the round's own subject, so it can't become a
-- general "any player can re-deal any item" backdoor.
--
-- Refusing outright (§2.1's Q5) needs nothing new: the forfeit is dealt as
-- one more card inside a truth_or_dare round, so Pass already costs the same
-- token from the same two-a-day economy, through pass_and_advance().
--
--
-- 2. contact_reveal_letter()  —  THEIR_ROUNDS §2.3
--
-- Contact's word-holder reveals their word one letter at a time. The word
-- itself has to stay genuinely hidden — this isn't Fibbage's answer key,
-- where reading it in devtools spoils one question; here the word IS the
-- entire round, and a public round_items row containing it would be visible
-- in the first network response.
--
-- So the word is sealed in round_secrets (dealt by deal_private, unreadable
-- until the round hits reveal) and only its revealed PREFIX is ever copied
-- into a public item. Postgres does the slicing; no client ever holds the
-- rest of the string. Same shape as deal_from_survey (0006): a definer
-- function is the only thing allowed to cross the boundary, and it copies
-- exactly the field the round needs and nothing more.
-- ============================================================================


-- ─── THE FORFEIT DEAL ───────────────────────────────────────────────────────
-- Deck arrives as jsonb from the host's client (public content, same as
-- deal_deck's):  [{"content": "...", "needs": "..."}, ...]
--
-- Writes TWO rows at the same idx:
--   * a public 'forfeit' row, so every phone agrees the round has an item
--     here and can show who's up — without it, non-recipients would see one
--     fewer item than the recipient and the "Card 4 of 13" counter would
--     disagree across the room;
--   * the private 'private' row carrying the actual card, visible to one
--     phone at the database level.
--
-- The chosen player also lands in rounds.subject, which is public — who's on
-- the hook is announced out loud anyway, and it's what lets reroll_forfeit
-- below check the caller cheaply.
create or replace function public.deal_forfeit(
  p_round uuid,
  p_idx   integer,
  p_deck  jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player text;
  v_card   jsonb;
begin
  perform public.assert_host();

  select id into v_player
    from public.players
   where claimed_by is not null
   order by random()
   limit 1;

  if v_player is null then
    raise exception 'nobody has claimed a profile yet' using errcode = 'P0002';
  end if;

  select value into v_card
    from jsonb_array_elements(coalesce(p_deck, '[]'::jsonb)) as t(value)
   where btrim(coalesce(value->>'content', '')) <> ''
   order by random()
   limit 1;

  if v_card is null then
    raise exception 'the forfeit deck is empty' using errcode = 'P0002';
  end if;

  insert into public.round_items (round_id, idx, kind, content, meta)
  values (p_round, p_idx, 'forfeit', 'A forfeit has been dealt.',
          jsonb_build_object('to', v_player))
  on conflict do nothing;

  insert into public.round_items (round_id, idx, kind, content, visible_to, meta)
  values (p_round, p_idx, 'private', v_card->>'content', v_player,
          jsonb_build_object('needs', v_card->>'needs'))
  on conflict (round_id, idx, kind, visible_to)
    do update set content = excluded.content, meta = excluded.meta;

  update public.rounds set subject = v_player where id = p_round;

  return v_player;
end;
$$;

grant execute on function public.deal_forfeit(uuid, integer, jsonb)
  to authenticated;


-- ─── "THIS ONE DOESN'T APPLY TO ME" ─────────────────────────────────────────
-- Self-service, by design (see this file's header). Only the round's own
-- subject may call it, only on a truth_or_dare round, and only to replace
-- their own card with a DIFFERENT one from the same deck — so the worst a
-- player can do with it is keep re-rolling their own forfeit, which is the
-- feature, not an exploit.
--
-- Nothing is written anywhere the room can see: no event, no score, no
-- config. A re-roll is supposed to be indistinguishable from being dealt
-- that card in the first place, or the eligibility check leaks the very
-- thing it was built to keep private.
create or replace function public.reroll_forfeit(p_round uuid, p_deck jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me       text := public.my_player_id();
  r_game   text;
  r_subj   text;
  r_cursor integer;
  v_now    text;
  v_card   jsonb;
begin
  if me is null then
    raise exception 'claim a profile first' using errcode = '42501';
  end if;

  select game, subject, item_cursor into r_game, r_subj, r_cursor
    from public.rounds
   where id = p_round;

  if r_game is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if r_game <> 'truth_or_dare' then
    raise exception 'reroll_forfeit is only for truth_or_dare' using errcode = '42501';
  end if;
  if r_subj is distinct from me then
    raise exception 'that forfeit was not dealt to you' using errcode = '42501';
  end if;

  select content into v_now
    from public.round_items
   where round_id = p_round and idx = r_cursor
     and kind = 'private' and visible_to = me;

  if v_now is null then
    raise exception 'no forfeit dealt to you here' using errcode = 'P0002';
  end if;

  select value into v_card
    from jsonb_array_elements(coalesce(p_deck, '[]'::jsonb)) as t(value)
   where btrim(coalesce(value->>'content', '')) <> ''
     and value->>'content' <> v_now
   order by random()
   limit 1;

  if v_card is null then
    raise exception 'no other forfeit left to deal' using errcode = 'P0002';
  end if;

  update public.round_items
     set content = v_card->>'content',
         meta    = jsonb_build_object('needs', v_card->>'needs')
   where round_id = p_round and idx = r_cursor
     and kind = 'private' and visible_to = me;
end;
$$;

grant execute on function public.reroll_forfeit(uuid, jsonb) to authenticated;


-- ─── CONTACT: ONE MORE LETTER ───────────────────────────────────────────────
-- Reads the sealed word, widens the public prefix by one character, and
-- records how many letters are out in rounds.config (see set_round_config in
-- 0015 for why that column is the right home for this and why nothing secret
-- may ever go in it).
--
-- Returns the new letter count, or the word's full length once it's fully
-- revealed — at which point the holder has run out of room and the round is
-- over, which the client reads off `letters >= length`.
--
-- The upsert is written as update-then-insert rather than ON CONFLICT: the
-- unique index on round_items is (round_id, idx, kind, visible_to), and this
-- row's visible_to is NULL, which Postgres treats as distinct from every
-- other NULL — so ON CONFLICT would never match and every reveal would add
-- another prefix row instead of widening the one that's there.
create or replace function public.contact_reveal_letter(p_round uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_word    text;
  v_letters integer;
begin
  perform public.assert_host();

  select s.payload->>'answer' into v_word
    from public.round_secrets s
   where s.round_id = p_round and s.idx = 0
   limit 1;

  if v_word is null or btrim(v_word) = '' then
    raise exception 'no word has been dealt for this round' using errcode = 'P0002';
  end if;

  select least(coalesce((config->>'letters')::integer, 0) + 1, length(v_word))
    into v_letters
    from public.rounds
   where id = p_round;

  if v_letters is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;

  update public.round_items
     set content = left(v_word, v_letters)
   where round_id = p_round and idx = 0 and kind = 'prefix' and visible_to is null;

  if not found then
    insert into public.round_items (round_id, idx, kind, content)
    values (p_round, 0, 'prefix', left(v_word, v_letters));
  end if;

  update public.rounds
     set config = config || jsonb_build_object('letters', v_letters,
                                               'length', length(v_word)),
         started_at = now()
   where id = p_round;

  return v_letters;
end;
$$;

grant execute on function public.contact_reveal_letter(uuid) to authenticated;
