-- ============================================================================
-- COMMUTATION — 0015: primitives for the group's own invented rounds
-- ============================================================================
-- docs/THEIR_ROUNDS.md turned survey section 7's twelve "invent a round"
-- answers into a build spec. Its §0 audited the engine against that spec and
-- found the gaps were mostly already closed by 0007/0008. This file closes
-- the ones that weren't, and nothing else:
--
--   1. normalise_answer() — one shared definition of "these two typed
--      answers are the same answer". Both scorers below depend on it, and
--      they must agree: a round that pays you for matching but not for
--      spelling it right is worse than one that pays for neither.
--
--   2. score_exact()      — Act It Out and Spell It Out are auto-scored
--      against a sealed answer that a PLAYER typed, not voted for.
--      score_item() (0006) scores votes for an author; score_plurality()
--      scores votes for a person. Neither can look at submissions.value at
--      all, which is where these two games' answers live.
--
--   3. score_agreement()  — THEIR_ROUNDS §1.3 asked for this by name: the
--      six-person shape of Family Feud. There's no pre-ranked board (six
--      people can't fill one), so you score by how many others in the room
--      wrote the same thing. Mirrors score_plurality's shape but groups
--      submissions instead of votes, and pays every member of a group
--      rather than only the winners.
--
--   4. deal_private_answers() — deal_private() (0007) seals exactly one
--      accepted answer. Auto-scoring a typed guess against exactly one
--      string means "worn out" loses to "exhausted", which is the fastest
--      way to make an auto-scored round feel rigged. Same insert, an
--      accept-list instead of a single string.
--
--   5. set_round_config() — three of the new rounds keep a small piece of
--      shared, non-secret state that isn't a cursor and isn't a phase:
--      which way the clapping circle is going, whether Contact's holder has
--      already blocked. rounds.config exists for exactly this and was
--      write-once at start_round time. Host-only, same as every other
--      round mutation.
--
-- All idempotent, all host-gated except where noted, none of them able to
-- read survey_responses.
-- ============================================================================


-- ─── ONE DEFINITION OF "THE SAME ANSWER" ────────────────────────────────────
-- Aggressive on purpose, per THEIR_ROUNDS §1.3: case, surrounding
-- whitespace, internal double-spacing, punctuation, and a leading article
-- all get flattened, plus the crudest possible singularise so "pizza" and
-- "pizzas" land in one group. IMMUTABLE so it can be used in an index later
-- if this ever needs one; it depends on nothing but its argument.
--
-- Deliberately NOT stemming beyond the trailing 's': "buses"/"bus" not
-- collapsing is a rounding error, but "kiss"/"ki" would be a bug, so the
-- rule refuses to strip an 's' that leaves fewer than three characters or
-- that follows another 's'.
-- Step order is load-bearing and was got wrong once: the leading-article
-- strip is anchored with ^, so it has to run AFTER trimming and whitespace
-- collapsing or "  The Pizzas!! " keeps its article and never matches
-- "pizza". Punctuation goes first, then whitespace, then the article, then
-- the plural.
create or replace function public.normalise_answer(p_text text)
returns text
language sql
immutable
as $$
  select case
           when length(base) > 3
                and right(base, 1) = 's'
                and right(base, 2) <> 'ss'
             then left(base, length(base) - 1)
           else base
         end
    from (
      select regexp_replace(
               btrim(
                 regexp_replace(
                   regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9 ]', '', 'g'),
                   '\s+', ' ', 'g'
                 )
               ),
               '^(the|a|an) ', ''
             ) as base
    ) t;
$$;

grant execute on function public.normalise_answer(text) to authenticated;


-- ─── DEALING A CARD WITH SEVERAL ACCEPTABLE ANSWERS ─────────────────────────
-- Same row shape deal_private() writes, so useCurrentItems() and the
-- round_items RLS policy don't need to know the difference — the only change
-- is what lands in round_secrets.payload:
--
--   deal_private          →  {"answer": "exhausted"}
--   deal_private_answers  →  {"answer": "exhausted",
--                             "accept": ["exhausted","tired","worn out"]}
--
-- score_exact() below reads `accept` when it's there and falls back to
-- `answer` when it isn't, so both deal functions auto-score identically.
create or replace function public.deal_private_answers(
  p_round    uuid,
  p_idx      integer,
  p_to       text,
  p_content  text,
  p_answers  text[]
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

  if p_answers is null or array_length(p_answers, 1) is null then
    raise exception 'deal_private_answers needs at least one answer'
      using errcode = 'P0002';
  end if;

  insert into public.round_items (round_id, idx, kind, content, visible_to)
  values (p_round, p_idx, 'private', p_content, p_to)
  returning id into new_item;

  insert into public.round_secrets (round_id, item_id, idx, author, payload)
  values (p_round, new_item, p_idx, p_to,
          jsonb_build_object('answer', p_answers[1],
                             'accept', to_jsonb(p_answers)))
  on conflict do nothing;
end;
$$;

grant execute on function
  public.deal_private_answers(uuid, integer, text, text, text[])
  to authenticated;


-- ─── SCORING A TYPED GUESS AGAINST A SEALED ANSWER ──────────────────────────
-- Act It Out (THEIR_ROUNDS §1.1) and Spell It Out (§1.2). Everyone who typed
-- the right thing scores; nobody adjudicates out loud.
--
-- The person the card was dealt to is excluded explicitly. They're holding
-- the answer — in Act It Out they're performing it, in Spell It Out they're
-- reading it aloud — so a stray submission from them can't farm the round.
create or replace function public.score_exact(
  p_round  uuid,
  p_idx    integer,
  p_points integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason  text := 'exact:' || p_round::text || ':' || p_idx::text;
  v_holder  text;
  v_accept  text[];
  v_paid    integer := 0;
begin
  perform public.assert_host();

  if exists (select 1 from public.scores s where s.reason = v_reason) then
    return 0;
  end if;

  select s.author,
         coalesce(
           (select array_agg(public.normalise_answer(a))
              from jsonb_array_elements_text(s.payload->'accept') a),
           array[public.normalise_answer(s.payload->>'answer')]
         )
    into v_holder, v_accept
    from public.round_secrets s
   where s.round_id = p_round and s.idx = p_idx
   limit 1;

  if v_accept is null then
    return 0;
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  select p_round, sub.player_id, p_points, v_reason
    from public.submissions sub
   where sub.round_id = p_round
     and sub.idx = p_idx
     and sub.player_id is not null
     and sub.player_id is distinct from v_holder
     and public.normalise_answer(sub.value) = any(v_accept);

  get diagnostics v_paid = row_count;
  return v_paid;
end;
$$;

grant execute on function public.score_exact(uuid, integer, integer)
  to authenticated;


-- ─── SCORING BY AGREEMENT ───────────────────────────────────────────────────
-- Survey Says (THEIR_ROUNDS §1.3). Everyone answers the same prompt; answers
-- are grouped by normalise_answer(); everyone in a group of two or more is
-- paid by that group's size.
--
-- Formula, resolved here rather than left to the caller (§1.3 left it to the
-- host's judgement): p_points × (group size − 1). Matching one other person
-- pays 100 each, matching two pays 200 each, and a lone answer pays nothing.
-- That's the shape that makes the reveal land — the room can see instantly
-- why the big cluster won, and an original answer costing you the round is
-- the whole joke of the format.
create or replace function public.score_agreement(
  p_round  uuid,
  p_idx    integer,
  p_points integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := 'agree:' || p_round::text || ':' || p_idx::text;
  v_paid   integer := 0;
begin
  perform public.assert_host();

  if exists (select 1 from public.scores s where s.reason = v_reason) then
    return 0;
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  select p_round, g.player_id, p_points * (g.group_size - 1), v_reason
    from (
      select sub.player_id,
             count(*) over (
               partition by public.normalise_answer(sub.value)
             ) as group_size
        from public.submissions sub
       where sub.round_id = p_round
         and sub.idx = p_idx
         and sub.player_id is not null
         and btrim(coalesce(sub.value, '')) <> ''
    ) g
   where g.group_size > 1;

  get diagnostics v_paid = row_count;
  return v_paid;
end;
$$;

grant execute on function public.score_agreement(uuid, integer, integer)
  to authenticated;


-- ─── SHARED, NON-SECRET ROUND STATE ─────────────────────────────────────────
-- Clap Circle needs "which way is the circle going and who's out"; Contact
-- needs "has the holder already spent their block on this letter". Neither
-- is a phase, neither is a cursor, and neither is a secret — rounds.config
-- is already documented as the home for exactly this ("per-game knobs",
-- 0005) and simply had no way to be written after start_round.
--
-- A shallow jsonb merge rather than a replace, so two knobs set by different
-- taps don't clobber each other. Host-only: same authority as set_phase and
-- set_cursor, and for the same reason — one device drives the round.
--
-- NOT a general write primitive for content: `config` is readable by every
-- client the instant it's set (rounds has a blanket SELECT policy), so
-- nothing sealed may ever be put here. That's why the word in Contact lives
-- in round_secrets and only its revealed prefix reaches an item.
create or replace function public.set_round_config(p_round uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  merged jsonb;
begin
  perform public.assert_host();

  update public.rounds
     set config = config || coalesce(p_patch, '{}'::jsonb)
   where id = p_round
  returning config into merged;

  if merged is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;

  return merged;
end;
$$;

grant execute on function public.set_round_config(uuid, jsonb) to authenticated;
