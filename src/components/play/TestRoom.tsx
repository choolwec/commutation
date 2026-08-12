"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { GAMES, gameById } from "@/games/registry";
import type { GameModule } from "@/lib/game/types";
import { Leaderboard } from "./Leaderboard";

/**
 * TEST MODE — play any non-TV game solo, before the day, without any of
 * the three things that would make that unsafe:
 *
 *   1. It never unlocks the real room. Games launched here pass
 *      `p_test: true` straight to start_round/start_deck_round (migration
 *      0011) — the Vault's real lock is untouched, and nothing here can
 *      accidentally open it for the other five people.
 *   2. It never reads real survey content. The five games that normally do
 *      (who_wrote_it, know_me_best, the_deep_end, most_likely_to,
 *      best_answer) each ship a `startTest` that deals obviously-fake
 *      content instead — see each game's own file for its fake deck.
 *      Everything else just runs its real `start()` with p_test injected,
 *      since those never touched survey_responses to begin with.
 *   3. It never pollutes the real leaderboard. Every score a test round
 *      awards is cascade-deleted by "Clear test data" below, because it
 *      hangs off a round with is_test = true.
 *
 * Arena games that need the physical TV are excluded — there's nothing to
 * test alone on a phone for those.
 */

function wrapTest(call: (fn: string, args?: Record<string, unknown>) => Promise<unknown>) {
  return (fn: string, args?: Record<string, unknown>) => {
    if (fn === "start_round" || fn === "start_deck_round") {
      return call(fn, { ...args, p_test: true });
    }
    return call(fn, args);
  };
}

export function TestRoom() {
  const { roster } = usePlayer();
  const { round, call } = useRoom();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const testable = GAMES.filter((g) => !g.requiresTv);

  async function launch(game: GameModule) {
    setError(null);
    setStarting(game.id);
    try {
      if (game.startTest) {
        await game.startTest({ call, roster });
      } else {
        await game.start({ call: wrapTest(call), roster });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start that one.");
    } finally {
      setStarting(null);
    }
  }

  async function clearTestData() {
    setClearing(true);
    await call("clear_test_rounds");
    setClearing(false);
  }

  if (round && round.phase !== "done") {
    const game = gameById(round.game);
    if (game) {
      return (
        <>
          {!round.is_test && (
            <div className="fixed left-0 right-0 top-0 z-[60] bg-flame py-1 text-center text-[11px] font-black uppercase tracking-wider text-ink">
              This is a real round, not a test one — careful
            </div>
          )}
          <game.PhoneView round={round} />
        </>
      );
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pad-safe-t pb-24">
      <header className="rise rounded-2xl border-2 border-dashed border-gold bg-gold/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Test mode</p>
        <p className="mt-1 text-sm leading-relaxed">
          Fake content only — five of these games swap in obviously-made-up
          test data instead of real answers. Nothing here can unlock the
          real Vault or leak a real confession, and nothing here counts
          toward Saturday.
        </p>
      </header>

      {error && (
        <p className="rise mt-4 rounded-2xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm text-flame">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {testable.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={starting !== null}
            onClick={() => void launch(g)}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40"
          >
            <span className="text-2xl">{g.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                {starting === g.id ? "Dealing…" : g.title}
              </span>
              <span className="block truncate text-xs text-mute">{g.blurb}</span>
            </span>
            {g.startTest && (
              <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">
                fake data
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void clearTestData()}
        disabled={clearing}
        className="mt-8 w-full rounded-2xl border border-dashed border-line py-3 text-sm font-bold text-mute active:scale-[0.98] disabled:opacity-40"
      >
        {clearing ? "Clearing…" : "Clear all test data"}
      </button>

      <div className="mt-8">
        <Leaderboard />
      </div>
    </main>
  );
}
