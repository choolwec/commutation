-- ============================================================================
-- COMMUTATION — 0004: writes go through one function
-- ============================================================================
-- Supersedes the write-policy approach in 0003. Run this even if 0003 was
-- applied; it's idempotent and doesn't depend on 0003 having worked.
--
-- Why: answers are unique on (player_id, question_id, answer_index) but were
-- owned by `author`, so a row left behind by an earlier session — Safari
-- clearing storage, or a profile takeover — made every later save to that
-- question fail with a silent 403. Fixing that by juggling UPDATE policies
-- turned out to be fragile: `INSERT ... ON CONFLICT DO UPDATE` also needs the
-- conflicting row to be visible under the SELECT policy, and reads are
-- deliberately author-scoped.
--
-- So writes now go through save_answer(), which runs SECURITY DEFINER and
-- does delete-then-insert in one statement pair. Authorisation is a single
-- explicit check — you must currently hold the profile — instead of four
-- policies that have to agree with each other.
--
-- READS ARE UNCHANGED AND STAY AUTHOR-SCOPED. Taking over a profile lets you
-- overwrite past answers blind; it never lets you read them. That's the
-- promise the app makes to the group, and nothing here weakens it.
-- ============================================================================

create or replace function public.holds_profile(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players p
     where p.id = p_id and p.claimed_by = auth.uid()
  );
$$;

grant execute on function public.holds_profile(text) to authenticated;


-- ─── save_answer ──────────────────────────────────────────────────────────
-- Upsert-by-replacement. Empty/whitespace values delete the row instead of
-- storing a blank, so a cleared field never counts toward progress or shows
-- up as an empty card in a game.
create or replace function public.save_answer(
  p_player_id    text,
  p_section_id   text,
  p_question_id  text,
  p_answer_index integer,
  p_value        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if not public.holds_profile(p_player_id) then
    raise exception 'you do not hold profile %', p_player_id
      using errcode = '42501';
  end if;

  delete from public.survey_responses
   where player_id = p_player_id
     and question_id = p_question_id
     and answer_index = p_answer_index;

  if p_value is not null and btrim(p_value) <> '' then
    insert into public.survey_responses
      (player_id, author, section_id, question_id, answer_index, value)
    values
      (p_player_id, auth.uid(), p_section_id, p_question_id, p_answer_index,
       p_value);
  end if;
end;
$$;

revoke all on function public.save_answer(text, text, text, integer, text)
  from public;
grant execute on function public.save_answer(text, text, text, integer, text)
  to authenticated;


-- ─── belt and braces ──────────────────────────────────────────────────────
-- Re-assert the SELECT policy. This is the privacy guarantee, and it is the
-- one thing in the schema that must never be loosened.
drop policy if exists "read only your own answers" on public.survey_responses;
create policy "read only your own answers"
  on public.survey_responses for select
  to authenticated
  using (author = auth.uid());
