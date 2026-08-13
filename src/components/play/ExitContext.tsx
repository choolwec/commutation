"use client";

import { createContext, useContext } from "react";

/**
 * "Let me out of this round."
 *
 * Before this existed, an active round was a trap: PlayRoom renders the
 * round's PhoneView instead of the Launcher for everybody, and the only way
 * back to the picker was the host clicking through to the end of whatever
 * game was running. A guest with nothing left to do in a round couldn't
 * check the leaderboard, and a game the room had lost interest in had to be
 * played out.
 *
 * Two different needs, deliberately kept apart (see GameShell's exit sheet):
 *
 *   · leave()  — LOCAL. Puts this one phone back on the picker while the
 *     round carries on for everyone else, with a "rejoin" bar so getting
 *     back is one tap. Available to everyone, changes nothing shared.
 *
 *   · ending the round — SHARED, and therefore host-only and confirmed.
 *     It's just set_phase(done), which is already assert_host()-gated in
 *     Postgres; GameShell only hides the button from non-hosts so nobody
 *     taps a thing that would error.
 *
 * A context rather than a prop because GameShell is rendered by 25 separate
 * game modules, none of which should have to know they're inside PlayRoom
 * versus TestRoom versus /preview. Null means "no local leave available
 * here" — /preview, and the TV — and GameShell degrades to just the
 * end-round option.
 */
export type ExitCtx = { leave: () => void } | null;

export const ExitContext = createContext<ExitCtx>(null);

export function useExit(): ExitCtx {
  return useContext(ExitContext);
}
