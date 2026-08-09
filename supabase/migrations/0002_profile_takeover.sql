-- ============================================================================
-- COMMUTATION — 0002: let a profile be taken back
-- ============================================================================
-- Problem this fixes: the update policy in 0001 only lets you write to a
-- profile that is unclaimed or already yours. Correct, but it means a
-- mis-tap — or Safari evicting localStorage, which it does after 7 days for
-- uninstalled sites — strands a profile that NOBODY can release, including
-- the host. On the day that costs you a player.
--
-- Fix: a SECURITY DEFINER function that reassigns a claim to the caller.
-- It touches only the claim columns, so it can't be used to edit anyone's
-- name, avatar or colour.
--
-- Deliberately NOT changed: survey_responses stays readable only by its
-- author (`author = auth.uid()`). Taking over a profile therefore does NOT
-- grant access to answers written by the previous session. That's the whole
-- privacy promise, and it outranks the convenience of re-editing old answers
-- after clearing your browser — the answers are still stored, still counted,
-- and still play in the games on Saturday.
-- ============================================================================

create or replace function public.claim_profile(p_id text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.players;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to claim a profile';
  end if;

  -- Release any profile the caller already holds, so one device can never
  -- occupy two seats.
  update public.players
     set claimed_by = null, claimed_at = null
   where claimed_by = auth.uid()
     and id <> p_id;

  update public.players
     set claimed_by = auth.uid(),
         claimed_at = now()
   where id = p_id
  returning * into result;

  if result is null then
    raise exception 'no such profile: %', p_id;
  end if;

  return result;
end;
$$;

revoke all on function public.claim_profile(text) from public;
grant execute on function public.claim_profile(text) to authenticated;


-- Releasing your own seat, for the "Not <name>?" button.
create or replace function public.release_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
     set claimed_by = null, claimed_at = null
   where claimed_by = auth.uid();
end;
$$;

revoke all on function public.release_profile() from public;
grant execute on function public.release_profile() to authenticated;
