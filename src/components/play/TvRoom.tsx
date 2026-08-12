"use client";

import { useEffect } from "react";
import { useRoom } from "@/lib/game/room";
import { gameById } from "@/games/registry";
import { Leaderboard } from "./Leaderboard";

/**
 * THE BIG SCREEN. `/tv` on the laptop — no profile claimed, no Gate. This
 * device's whole job is `tv_ping()` (heartbeat, so the launcher knows an
 * Arena game is actually playable) and rendering whatever's live, big
 * enough to read from three metres away.
 *
 * Most games here only shipped a PhoneView — the six-phone game is complete
 * without a screen (per PLAN.md, Huddle/Vault never need one, and time
 * didn't stretch to bespoke TV layouts for every Arena game before
 * Saturday). This is the honest fallback for those: the round's PUBLIC
 * content plus the live leaderboard, so the TV is still useful — a
 * scoreboard and a shared prompt — even without a custom board.
 */
export function TvRoom() {
  const { room, round, items, call } = useRoom();

  useEffect(() => {
    const ping = () => void call("tv_ping");
    ping();
    const id = setInterval(ping, 20_000);
    return () => clearInterval(id);
  }, [call]);

  if (!round || round.phase === "done") {
    return <Idle unlockedAt={room?.unlocked_at ?? null} />;
  }

  const game = gameById(round.game);
  if (game?.TvView) {
    return <game.TvView round={round} />;
  }

  const publicItems = items.filter((i) => i.idx === round.item_cursor && i.visible_to === null);

  return (
    <main className="grid min-h-dvh grid-cols-[1fr_360px] gap-8 p-10">
      <section className="flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-2xl font-black uppercase tracking-[0.3em] text-mute">
          {game?.icon} {game?.title ?? round.game}
        </p>
        {publicItems.length > 0 ? (
          publicItems.map((i) => (
            <p key={i.id} className="max-w-3xl text-5xl font-black leading-tight">
              {i.kind === "drawing" ? null : i.content}
            </p>
          ))
        ) : (
          <p className="text-3xl font-bold text-mute">Look at your phones.</p>
        )}
      </section>
      <aside className="flex flex-col justify-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-mute">
          Leaderboard
        </p>
        <Leaderboard />
      </aside>
    </main>
  );
}

function Idle({ unlockedAt }: { unlockedAt: string | null }) {
  const url =
    typeof window !== "undefined"
      ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
      : "";

  return (
    <main className="grid min-h-dvh grid-cols-[1fr_360px] gap-8 p-10">
      <section className="flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-4xl font-black tracking-tight">COMMUTATION</p>
        <p className="text-lg text-mute">
          {unlockedAt ? "Waiting for the host to launch something." : "Unlocking soon."}
        </p>
      </section>
      <aside className="flex flex-col items-center justify-center gap-4">
        {url && (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`}
            alt="Scan to join"
            width={220}
            height={220}
            className="rounded-2xl border border-line bg-paper p-3"
          />
        )}
        <p className="text-sm text-mute">Scan to join</p>
        <div className="mt-6 w-full">
          <Leaderboard />
        </div>
      </aside>
    </main>
  );
}
