"use client";

import { useState } from "react";
import { useRoom } from "@/lib/game/room";
import { Launcher } from "./Launcher";
import { gameById } from "@/games/registry";
import { Evidence } from "@/components/Evidence";
import { ExitContext } from "./ExitContext";

/** Whichever round the room is currently on, or the launcher if there isn't one. */
export function PlayRoom() {
  const { round } = useRoom();

  // Which round this phone has stepped out of. Stored as an id rather than a
  // boolean so a NEW round automatically pulls everyone back in — the host
  // starting the next game shouldn't leave anyone stranded on the picker
  // because they browsed away from the previous one. See ExitContext.
  const [leftRound, setLeftRound] = useState<string | null>(null);
  const browsing = Boolean(round && leftRound === round.id);

  if (!round || round.phase === "done" || browsing) {
    const game = round ? gameById(round.game) : undefined;
    return (
      <>
        <Launcher />
        {browsing && round && (
          // A "now playing" bar, sat just above the tab bar — the shape
          // people already know from every music app, and one tap back in.
          <button
            type="button"
            onClick={() => setLeftRound(null)}
            className="fixed inset-x-0 z-30 mx-auto flex max-w-md items-center gap-3 px-5"
            style={{ bottom: "calc(var(--sab) + 4.25rem)" }}
          >
            <span className="flex w-full items-center gap-3 rounded-2xl border border-flame/50 bg-ink-2/95 px-4 py-3 text-left backdrop-blur">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-flame" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {game?.title ?? "A round"} is still going
                </span>
                <span className="block text-xs text-mute">tap to rejoin</span>
              </span>
              <span className="shrink-0 text-lg">{game?.icon ?? "▶"}</span>
            </span>
          </button>
        )}
        <Evidence />
      </>
    );
  }

  const game = gameById(round.game);
  if (!game) {
    // A round exists for a game id this build doesn't know about — surface
    // it rather than white-screening, since that's a real, fixable bug
    // (a stale round from testing, a typo'd id) not a state to hide.
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-mute">
          Unknown game &quot;{round.game}&quot; — ask the host to finish or reset it.
        </p>
      </main>
    );
  }

  return (
    <ExitContext.Provider value={{ leave: () => setLeftRound(round.id) }}>
      <game.PhoneView round={round} />
      <Evidence />
    </ExitContext.Provider>
  );
}
