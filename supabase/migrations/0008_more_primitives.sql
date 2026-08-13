-- ============================================================================
-- COMMUTATION — 0008: three gaps found while building the actual games
-- ============================================================================
-- 0005-0007 covered Who Wrote It? and the odd-one-out games cleanly. Building
-- Know Me Best, Paranoia, Fibbage and Buzz In each needed a shape the first
-- pass didn't have. Rather than force these into the existing primitives —
-- which is how 0003 happened — three small additions, each solving exactly
-- one problem:
--
--   1. deal_hidden_answer() — Know Me Best needs the QUESTION public and the
--      real ANSWER sealed. deal_from_survey() couples them (the answer IS
--      the content). This splits them.
--
--   2. reveal_item() — Paranoia's coin flip sometimes reveals the question
--      that was dealt privately to one phone. Nothing could turn a private
--      item public; this does, and only the host can call it.
--
--   3. round_events + seed_truth_submission() — Buzz In needs "who buzzed
--      first" visible to everyone the instant it happens, which submissions
--      and votes deliberately can't do (they stay sealed until the host
--      opens them). Fibbage needs a "true answer" option that's visible
--      alongside real submissions but INDISTINGUISHABLE from them until the
--      reveal — solved by letting a submission have no author.
-- ============================================================================


-- ─── KNOW ME BEST ───────────────────────────────────────────────────────────
-- The prompt ("your worst habit") is public and always was — everyone
-- answered the same question. The SUBJECT's actual answer is what's sealed:
-- if it landed in round_items.content it would be readable the instant it's
-- dealt, before anyone has guessed. So the prompt goes in round_items, the
-- real answer goes in round_secrets, same separation as everywhere else.
create or replace function public.deal_hidden_answer(
  p_round       uuid,
  p_idx         integer,
  p_subject     text,
  p_question_id text,
  p_prompt      text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  real_answer text;
  new_item    uuid;
begin
  perform public.assert_host();

  select value into real_answer
    from public.survey_responses
   where player_id = p_subject and question_id = p_question_id
   order by answer_index limit 1;

  if real_answer is null or btrim(real_answer) = '' then
    return false;
  end if;

  insert into public.round_items (round_id, idx, kind, content)
  values (p_round, p_idx, 'prompt', p_prompt)
  returning id into new_item;

  insert into public.round_secrets (round_id, item_id, idx, author, payload)
  values (p_round, new_item, p_idx, p_subject,
          jsonb_build_object('value', real_answer))
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function
  public.deal_hidden_answer(uuid, integer, text, text, text)
  to authenticated;


-- ─── PARANOIA'S COIN FLIP ───────────────────────────────────────────────────
-- deal_private() (0007) dealt the question to one phone alone. Sometimes the
-- flip says the room gets to know it too — this is the only way a privately
-- dealt item can become public, and it only moves one direction.
create or replace function public.reveal_item(p_round uuid, p_idx integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_host();

  update public.round_items
     set visible_to = null
   where round_id = p_round and idx = p_idx and visible_to is not null;
end;
$$;

grant execute on function public.reveal_item(uuid, integer) to authenticated;


-- ─── FIBBAGE'S PHANTOM SUBMISSION ───────────────────────────────────────────
-- A submission normally belongs to whoever wrote it — that's what
-- `player_id not null` meant. Fibbage needs one more kind of row: the real
-- answer, sitting in the same list as everyone's lies, unattributable to any
-- player because it didn't come from one. Dropping the not-null is the whole
-- change; the uniqueness constraint already treats NULLs as distinct so this
-- can't collide with anyone's real submission.
alter table public.submissions alter column player_id drop not null;

create or replace function public.seed_truth_submission(
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
  new_sub uuid;
begin
  perform public.assert_host();

  insert into public.submissions (round_id, player_id, idx, kind, value)
  values (p_round, null, p_idx, 'lie', p_value)
  returning id into new_sub;

  -- Sealed until reveal, same as every other secret. Before that, this
  -- submission reads exactly like a player's lie — that indistinguishability
  -- is the entire game.
  insert into public.round_secrets (round_id, idx, author, payload)
  values (p_round, p_idx, null, jsonb_build_object('truth_submission', new_sub))
  on conflict do nothing;
end;
$$;

grant execute on function public.seed_truth_submission(uuid, integer, text)
  to authenticated;


-- ─── LIVE, UNSEALED SIGNALS ─────────────────────────────────────────────────
-- Buzz In's whole mechanic is "everyone sees, instantly, that someone else
-- already buzzed" — the opposite of what submissions/votes are built to do.
-- This table is for exactly that class of event: not a secret answer, a
-- public race. Always readable; you may only ever write your own row.
create table if not exists public.round_events (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.rounds(id) on delete cascade,
  idx        integer not null default 0,
  player_id  text not null references public.players(id) on delete cascade,
  kind       text not null,
  value      text,
  created_at timestamptz not null default now()
);

create index if not exists round_events_round_idx
  on public.round_events (round_id, idx, created_at);

alter table public.round_events enable row level security;

drop policy if exists "events are visible to all" on public.round_events;
create policy "events are visible to all"
  on public.round_events for select
  using (true);

drop policy if exists "you may only post your own event" on public.round_events;
create policy "you may only post your own event"
  on public.round_events for insert
  to authenticated
  with check (player_id = public.my_player_id());

do $$
begin
  alter publication supabase_realtime add table public.round_events;
exception
  when duplicate_object then null;
end $$;
