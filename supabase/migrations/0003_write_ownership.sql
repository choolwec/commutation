-- ============================================================================
-- COMMUTATION — 0003: writes follow the profile, reads follow the author
-- ============================================================================
-- The bug this fixes, found by the end-to-end test:
--
--   survey_responses is unique on (player_id, question_id, answer_index),
--   but 0001 scoped INSERT/UPDATE/DELETE to `author = auth.uid()`. Those two
--   disagree the moment a device's session changes — Safari clearing its
--   storage, or a profile takeover from 0002.
--
--   The result was a permanent, silent 403: the upsert hits the unique
--   constraint, tries to UPDATE a row owned by the old uid, fails the USING
--   check, and that question can never be answered again. On the day that
--   looks like "the app won't save anything I type."
--
-- The model after this migration:
--
--   WRITE  → whoever currently holds the profile. Answers belong to the seat,
--            not to a browser session that Safari may have thrown away.
--   READ   → still, only the author (`author = auth.uid()`), unchanged.
--
-- That split is deliberate. Making reads profile-scoped would fix the same
-- bug in one line, but it would also mean anyone who takes over a profile
-- could read that person's confessions — which is exactly the promise the
-- app makes to the group. So a takeover can overwrite past answers blind,
-- and can never read them.
-- ============================================================================

-- Helper: does the caller currently hold this profile?
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


-- ─── SELECT: unchanged, author-only. This is the privacy guarantee. ────────
-- (Restated rather than left implicit, so this file shows the full picture.)
drop policy if exists "read only your own answers" on public.survey_responses;
create policy "read only your own answers"
  on public.survey_responses for select
  to authenticated
  using (author = auth.uid());


-- ─── INSERT ───────────────────────────────────────────────────────────────
drop policy if exists "write only your own answers" on public.survey_responses;
drop policy if exists "write answers for the profile you hold"
  on public.survey_responses;
create policy "write answers for the profile you hold"
  on public.survey_responses for insert
  to authenticated
  with check (author = auth.uid() and public.holds_profile(player_id));


-- ─── UPDATE ───────────────────────────────────────────────────────────────
-- USING lets you reach a row written by a previous session; WITH CHECK
-- forces `author` to be rewritten to you, so the row stops being orphaned.
-- The client sends `author` explicitly on every upsert to satisfy this.
drop policy if exists "update only your own answers" on public.survey_responses;
drop policy if exists "update answers for the profile you hold"
  on public.survey_responses;
create policy "update answers for the profile you hold"
  on public.survey_responses for update
  to authenticated
  using (public.holds_profile(player_id))
  with check (author = auth.uid() and public.holds_profile(player_id));


-- ─── DELETE ───────────────────────────────────────────────────────────────
-- Clearing a field must work on inherited rows too, or a blanked answer
-- would silently persist into the games.
drop policy if exists "delete only your own answers" on public.survey_responses;
drop policy if exists "delete answers for the profile you hold"
  on public.survey_responses;
create policy "delete answers for the profile you hold"
  on public.survey_responses for delete
  to authenticated
  using (public.holds_profile(player_id));
