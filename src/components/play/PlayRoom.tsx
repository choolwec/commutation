"use client";

import { useRoom } from "@/lib/game/room";
import { Launcher } from "./Launcher";
import { gameById } from "@/games/registry";
import { Evidence } from "@/components/Evidence";

/** Whichever round the room is currently on, or the launcher if there isn't one. */
export function PlayRoom() {
  const { round } = useRoom();

  if (!round || round.phase === "done") {
    return (
      <>
        <Launcher />
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
    <>
      <game.PhoneView round={round} />
      <Evidence />
    </>
  );
}
