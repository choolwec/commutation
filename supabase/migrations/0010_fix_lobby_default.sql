-- ============================================================================
-- COMMUTATION — 0010: rounds should open playable, not locked
-- ============================================================================
-- `rounds.phase` defaulted to 'lobby', and start_round()/start_deck_round()
-- never override it. But submit_answer() and cast_vote() only accept phase
-- in ('play','vote') — so every round, in every one of the 16 games built
-- against this engine, would have rejected the very first tap. Nothing in
-- any of them deliberately uses 'lobby' as a "read your card before writes
-- open" state (reading round_items never depended on phase to begin with,
-- only writing did) — they all just assumed a fresh round was immediately
-- playable. The schema disagreed. This is the fix: match what was actually
-- built rather than editing sixteen call sites to add a phase transition
-- none of them were designed around.
-- ============================================================================

alter table public.rounds alter column phase set default 'play';
