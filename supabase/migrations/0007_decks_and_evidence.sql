-- ============================================================================
-- COMMUTATION — 0007: standalone games, and Evidence
-- ============================================================================
-- 0006 could only start rounds fed by the survey. That makes the whole app
-- hostage to how many questions people answered, which is backwards: the
-- questionnaire is meant to be one great hall of three, not the foundation.
--
-- So this file adds the two things standalone games need:
--
--   1. deal_deck()  — the host's device supplies content from a deck compiled
--                     into the JS bundle (Spyfall locations, trivia, charades
--                     prompts). No survey involvement at all.
--
--   2. deal_roles() — the odd-one-out primitive. Postgres decides who the spy
--                     is, deals each phone a different private card, and tells
--                     nobody. This one genuinely cannot be done client-side:
--                     whoever's device picked the spy would know the spy.
--
-- Plus EVIDENCE: random photo prompts fired across the day.
-- ============================================================================


-- ─── DEALING FROM A DECK ────────────────────────────────────────────────────
-- Content arrives as jsonb from the host's client:
--   [{"content": "...", "meta": {...}}, ...]
-- Nothing secret can be passed here — it's all public content, dealt to
-- everyone. Anything that needs hiding goes through deal_roles() below.
create or replace function public.deal_deck(
  p_round uuid,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  dealt integer := 0;
begin
  perform public.assert_host();

  insert into public.round_items (round_id, idx, kind, content, meta)
  select p_round,
         (ord - 1)::integer,
         'deck',
         item->>'content',
         coalesce(item->'meta', '{}'::jsonb)
    from jsonb_array_elements(p_items) with ordinality as t(item, ord)
   where btrim(coalesce(item->>'content', '')) <> '';

  get diagnostics dealt = row_count;
  return dealt;
end;
$$;

grant execute on function public.deal_deck(uuid, jsonb) to authenticated;


-- ─── THE ODD ONE OUT ────────────────────────────────────────────────────────
-- Spyfall, The Chameleon, Fake Artist — one player gets a different card and
-- everybody has to work out who.
--
-- Why this is server-side: if the host's phone drew the spy, the host would
-- know the spy, and the host is playing. Postgres draws instead, writes each
-- card as a row visible only to its owner, and records the answer in
-- round_secrets where 0005's policy keeps it sealed until the reveal.
--
-- The host's device passes in the deck content and learns only a row count
-- back. It never sees the assignment.
create or replace function public.deal_roles(
  p_round          uuid,
  p_shared_content text,      -- what everyone-but-the-odd-one sees
  p_odd_content    text,      -- what the odd one sees
  p_role_variants  text[] default null,  -- optional flavour role per player
  p_odd_count      integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  odd_ids  text[];
  rec      record;
  i        integer := 0;
  variant  text;
begin
  perform public.assert_host();

  -- Only people actually holding a profile are in the game. Someone who
  -- never claimed can't be dealt the spy card and silently break the round.
  select array_agg(id) into odd_ids
    from (
      select id from public.players
       where claimed_by is not null
       order by random()
       limit greatest(p_odd_count, 1)
    ) t;

  if odd_ids is null then
    raise exception 'nobody has claimed a profile yet' using errcode = 'P0002';
  end if;

  for rec in
    select id from public.players where claimed_by is not null order by random()
  loop
    if rec.id = any(odd_ids) then
      insert into public.round_items (round_id, idx, kind, content, visible_to)
      values (p_round, 0, 'role', p_odd_content, rec.id);
    else
      -- Each non-spy gets a different role from the variant list, which is
      -- what makes Spyfall's questioning work — "what are you wearing?" only
      -- has a right answer if you know your own job.
      variant := case
        when p_role_variants is null or array_length(p_role_variants, 1) is null
          then null
        else p_role_variants[1 + (i % array_length(p_role_variants, 1))]
      end;

      insert into public.round_items (round_id, idx, kind, content, visible_to, meta)
      values (
        p_round, 0, 'role', p_shared_content, rec.id,
        case when variant is null then '{}'::jsonb
             else jsonb_build_object('role', variant) end
      );
      i := i + 1;
    end if;
  end loop;

  -- The answer, sealed until phase reaches reveal.
  insert into public.round_secrets (round_id, idx, author, payload)
  select p_round, 0, unnest(odd_ids),
         jsonb_build_object('shared', p_shared_content)
  on conflict do nothing;

  return array_length(odd_ids, 1);
end;
$$;

grant execute on function
  public.deal_roles(uuid, text, text, text[], integer) to authenticated;


-- ─── STARTING A DECK ROUND ──────────────────────────────────────────────────
-- start_round() in 0006 refuses to start a round it can't deal content for,
-- which is right for Vault games but wrong here: deck games are dealt in a
-- second call, because the deck lives in the browser bundle. This opens an
-- empty round for the host to fill.
create or replace function public.start_deck_round(
  p_game    text,
  p_hall    text,
  p_subject text default null,
  p_config  jsonb default '{}'::jsonb
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

  insert into public.rounds (game, hall, subject, config)
  values (p_game, p_hall, p_subject, coalesce(p_config, '{}'::jsonb))
  returning id into new_id;

  update public.game_room
     set active_round = new_id, updated_at = now()
   where id = 'commutation';

  return new_id;
end;
$$;

grant execute on function public.start_deck_round(text, text, text, jsonb)
  to authenticated;


-- Scoring for odd-one-out games: the room wins by voting out the spy, the
-- spy wins by surviving.
create or replace function public.score_odd_one_out(p_round uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := 'oddone:' || p_round::text;
  spy      text;
  caught   integer;
begin
  perform public.assert_host();

  if exists (select 1 from public.scores s where s.reason = v_reason) then
    return;
  end if;

  select author into spy
    from public.round_secrets where round_id = p_round and idx = 0 limit 1;

  if spy is null then
    return;
  end if;

  select count(*) into caught
    from public.votes v
   where v.round_id = p_round and v.idx = 0 and v.value = spy;

  -- Everyone who fingered the spy.
  insert into public.scores (round_id, player_id, points, reason)
  select p_round, v.player_id, 100, v_reason
    from public.votes v
   where v.round_id = p_round and v.idx = 0 and v.value = spy;

  -- The spy, for surviving a majority.
  if caught * 2 <= (
    select count(*) from public.votes where round_id = p_round and idx = 0
  ) then
    insert into public.scores (round_id, player_id, points, reason)
    values (p_round, spy, 250, v_reason);
  end if;
end;
$$;

grant execute on function public.score_odd_one_out(uuid) to authenticated;


-- ─── DEALING TO ONE NAMED PERSON ────────────────────────────────────────────
-- deal_roles() picks its recipient at random, which is right for Spyfall and
-- wrong for everything where the host means a specific person: Paranoia's
-- question goes to whoever's turn it is, Hot Seat has a named subject, and
-- several of the invented rounds hand one performer a card nobody else sees.
--
-- The sealed answer rides along in round_secrets so the round can auto-score
-- on the reveal instead of somebody adjudicating out loud.
create or replace function public.deal_private(
  p_round   uuid,
  p_idx     integer,
  p_to      text,
  p_content text,
  p_answer  text default null
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

  insert into public.round_items (round_id, idx, kind, content, visible_to)
  values (p_round, p_idx, 'private', p_content, p_to)
  returning id into new_item;

  if p_answer is not null then
    insert into public.round_secrets (round_id, item_id, idx, author, payload)
    values (p_round, new_item, p_idx, p_to,
            jsonb_build_object('answer', p_answer))
    on conflict do nothing;
  end if;
end;
$$;

grant execute on function public.deal_private(uuid, integer, text, text, text)
  to authenticated;


-- ─── MANUAL SCORING ─────────────────────────────────────────────────────────
-- Several of the games the group invented are adjudicated out loud — the app
-- runs the timer, the turn order and the ledger while a human decides who
-- actually won. Without this there is no way to record that result, and
-- `scores` deliberately has no INSERT policy.
--
-- Host-only, and every award carries a reason string, so the end-of-day
-- Awards can still be computed from real data rather than memory.
create or replace function public.award_points(
  p_player text,
  p_points integer,
  p_reason text,
  p_round  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_host();

  if not exists (select 1 from public.players where id = p_player) then
    raise exception 'no such player %', p_player using errcode = 'P0002';
  end if;

  insert into public.scores (round_id, player_id, points, reason)
  values (p_round, p_player, p_points, coalesce(p_reason, 'manual'));
end;
$$;

grant execute on function public.award_points(text, integer, text, uuid)
  to authenticated;


-- ============================================================================
-- EVIDENCE — random photo prompts across the day
-- ============================================================================
-- At a random moment your phone goes off and asks for two photos of whatever
-- is in front of you, right now. Because nobody knows when theirs is coming,
-- what ends up in the recap is the day as it actually looked rather than six
-- people posing.
--
-- The scheduling problem, given there is no server: the whole day's schedule
-- is generated in one go, here, as rows. Postgres picks the times and who
-- gets them. Each phone watches for its own and fires when the moment
-- arrives. No cron, no backend, and the randomness belongs to the database
-- rather than to any one player's device.
--
-- NOTE ON PRIVACY, because it differs from everything else in this schema:
-- photos are SHARED, deliberately. Survey answers are sealed because the
-- reveals depend on it. A memories gallery that only you can see is
-- pointless. Different rule, on purpose.

create table if not exists public.evidence_prompts (
  id           uuid primary key default gen_random_uuid(),
  player_id    text not null references public.players(id) on delete cascade,

  -- When this phone should go off.
  due_at       timestamptz not null,
  prompt       text not null,

  status       text not null default 'pending'
               check (status in ('pending','done','missed')),
  completed_at timestamptz
);

create index if not exists evidence_prompts_due_idx
  on public.evidence_prompts (player_id, due_at);

alter table public.evidence_prompts enable row level security;

-- You only ever see your own prompts, and the surprise survives.
drop policy if exists "your own prompts" on public.evidence_prompts;
create policy "your own prompts"
  on public.evidence_prompts for select
  to authenticated
  using (player_id = public.my_player_id());


create table if not exists public.evidence_photos (
  id         uuid primary key default gen_random_uuid(),
  prompt_id  uuid references public.evidence_prompts(id) on delete set null,
  player_id  text not null references public.players(id) on delete cascade,

  -- Path within the `evidence` storage bucket.
  path       text not null,
  caption    text,

  created_at timestamptz not null default now()
);

create index if not exists evidence_photos_created_idx
  on public.evidence_photos (created_at);

alter table public.evidence_photos enable row level security;

-- The gallery is the whole point.
drop policy if exists "photos are visible to all" on public.evidence_photos;
create policy "photos are visible to all"
  on public.evidence_photos for select
  using (true);

drop policy if exists "upload your own photos" on public.evidence_photos;
create policy "upload your own photos"
  on public.evidence_photos for insert
  to authenticated
  with check (player_id = public.my_player_id());


-- Lays out the day. Host-only, idempotent — running it twice doesn't double
-- up, so a nervous re-tap on the day costs nothing.
create or replace function public.schedule_evidence(
  p_start      timestamptz,
  p_end        timestamptz,
  p_per_player integer,
  p_prompts    text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made   integer := 0;
  rec    record;
  i      integer;
  span   numeric;
  slot   timestamptz;
begin
  perform public.assert_host();

  if exists (select 1 from public.evidence_prompts) then
    return 0;
  end if;

  if p_prompts is null or array_length(p_prompts, 1) is null then
    raise exception 'no prompts supplied' using errcode = 'P0002';
  end if;

  span := extract(epoch from (p_end - p_start));

  for rec in select id from public.players where claimed_by is not null loop
    for i in 1..greatest(p_per_player, 1) loop
      -- Spread across the day in even windows, jittered inside each, so
      -- nobody gets three in the first ten minutes and none after five.
      slot := p_start + make_interval(secs =>
        (span * (i - 1) / greatest(p_per_player, 1))
        + random() * (span / greatest(p_per_player, 1))
      );

      insert into public.evidence_prompts (player_id, due_at, prompt)
      values (
        rec.id,
        slot,
        p_prompts[1 + floor(random() * array_length(p_prompts, 1))::integer]
      );
      made := made + 1;
    end loop;
  end loop;

  return made;
end;
$$;

grant execute on function
  public.schedule_evidence(timestamptz, timestamptz, integer, text[])
  to authenticated;


-- Marks a prompt answered and pays out. Points make people actually do it;
-- without them a surprise camera prompt is just an interruption.
create or replace function public.complete_evidence(p_prompt uuid)
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

  update public.evidence_prompts
     set status = 'done', completed_at = now()
   where id = p_prompt and player_id = me and status <> 'done';

  if found then
    insert into public.scores (round_id, player_id, points, reason)
    values (null, me, 75, 'evidence:' || p_prompt::text);
  end if;
end;
$$;

grant execute on function public.complete_evidence(uuid) to authenticated;


-- ─── STORAGE ────────────────────────────────────────────────────────────────
-- Public-read bucket: the recap gallery has to render on the TV and on six
-- phones without signed-URL juggling. Writes stay authenticated-only.
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

drop policy if exists "evidence readable" on storage.objects;
create policy "evidence readable"
  on storage.objects for select
  using (bucket_id = 'evidence');

drop policy if exists "evidence uploadable" on storage.objects;
create policy "evidence uploadable"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidence');


-- ─── REALTIME ───────────────────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.evidence_photos;
  alter publication supabase_realtime add table public.round_items;
exception
  when duplicate_object then null;
end $$;
