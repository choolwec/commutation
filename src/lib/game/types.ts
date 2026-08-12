/**
 * THE GAME CONTRACT.
 *
 * Every game is a folder implementing GameModule. Adding one is a new file
 * and a line in the registry — never a change to the engine. That's the
 * point: twelve games were invented by the group in survey section 7, and
 * they had to be cheap to add after the engine was already written.
 */

import type { ComponentType } from "react";

export type Hall = "vault" | "huddle" | "arena";

/**
 * The clock every screen in the building reads from.
 *
 * `vote` is separate from `play` because several games collect answers and
 * then vote on them (Best Answer, Fibbage) — the same round, two different
 * things being asked of the same six people.
 */
export type Phase = "lobby" | "play" | "vote" | "reveal" | "done";

export type Round = {
  id: string;
  game: string;
  hall: Hall;
  phase: Phase;
  subject: string | null;
  config: Record<string, unknown>;
  item_cursor: number;
  show_submissions: boolean;
  show_votes: boolean;
  /** When the current phase's clock started — see RoundTimer.tsx. */
  started_at: string | null;
  /** True for rounds started from /test — never real content, see 0011. */
  is_test: boolean;
  created_at: string;
  ended_at: string | null;
};

export type RoundItem = {
  id: string;
  round_id: string;
  idx: number;
  kind: string;
  content: string;
  /** Null = dealt to the room. A player id = dealt to that phone alone. */
  visible_to: string | null;
  meta: Record<string, unknown>;
};

/** Unreadable until the round hits `reveal` — enforced in Postgres, not here. */
export type RoundSecret = {
  id: string;
  round_id: string;
  item_id: string | null;
  idx: number;
  author: string | null;
  payload: Record<string, unknown>;
};

export type Submission = {
  id: string;
  round_id: string;
  player_id: string;
  idx: number;
  kind: string;
  value: string;
  created_at: string;
};

export type Vote = {
  id: string;
  round_id: string;
  player_id: string;
  idx: number;
  value: string;
  created_at: string;
};

/** Always public — a race signal (Buzz In's "who buzzed first"), not a secret. */
export type RoundEvent = {
  id: string;
  round_id: string;
  idx: number;
  player_id: string;
  kind: string;
  value: string | null;
  created_at: string;
};

export type LeaderRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  points: number;
};

export type GameRoom = {
  id: string;
  host_player: string | null;
  unlocked_at: string | null;
  active_round: string | null;
  tv_seen_at: string | null;
};

/**
 * Where a round's content comes from.
 *
 * The distinction that matters: `survey` content is sealed and dealt by
 * Postgres, so the host's device never sees it before the room does. `deck`
 * content ships in the JS bundle and the host's device deals it, which is
 * fine precisely because it isn't secret. `roles` is the odd-one-out draw —
 * server-side because whoever draws the spy would otherwise know the spy.
 */
export type ContentSource =
  | { kind: "survey"; questionIds: string[]; items: number }
  | { kind: "deck" }
  | { kind: "roles" }
  | { kind: "none" };

export type GameViewProps = {
  round: Round;
};

/**
 * What a game's `start()` gets to work with. Deliberately just `call` (the
 * RPC dispatcher, already bound to refetch afterward — see room.tsx) plus
 * the roster: everything else a game needs to decide how to deal itself
 * (who's the subject, which tier, how many items) it already knows from its
 * own config and from `roster`.
 */
export type StartCtx = {
  call: (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
  roster: { id: string; name: string; claimed_by: string | null }[];
};

export type GameModule = {
  id: string;
  title: string;
  hall: Hall;
  icon: string;
  /** One line in the host's launcher. Should say what the room has to DO. */
  blurb: string;
  source: ContentSource;
  /** Arena games need the laptop; the launcher greys them out without a TV. */
  requiresTv?: boolean;
  /** Rough minutes, so the host can pick something that fits the moment. */
  minutes?: number;
  /**
   * Deals the round. Owns its own sequence — start_round vs
   * start_deck_round, one deal call or several, picking a subject — so the
   * launcher never needs a per-game special case. Should throw with a
   * readable message on failure (e.g. "nothing left to play"); the launcher
   * catches and shows it rather than leaving a half-started round.
   */
  start: (ctx: StartCtx) => Promise<void>;
  /**
   * Test-mode alternative to `start`. Only needed by games whose real
   * `start()` reads sealed survey content — for those, this deals FAKE
   * content instead (via deal_test_pair/deal_test_hidden, migration 0011),
   * so testing on a phone before the day never exposes a real answer to
   * anyone, host included. Games that never touch survey_responses don't
   * need this; the test launcher falls back to `start` for them.
   */
  startTest?: (ctx: StartCtx) => Promise<void>;
  PhoneView: ComponentType<GameViewProps>;
  TvView?: ComponentType<GameViewProps>;
};
