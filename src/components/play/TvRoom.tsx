"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoom } from "@/lib/game/room";
import { usePlayer } from "@/lib/player";
import { gameById } from "@/games/registry";
import { TILE_ACCENT, TileMotif } from "@/games/tileArt";
import { Leaderboard } from "./Leaderboard";

/**
 * THE BIG SCREEN. `/tv` on the laptop — no profile claimed, no Gate. This
 * device's whole job is `tv_ping()` (heartbeat, so the launcher knows an
 * Arena game is actually playable) and rendering whatever's live, big
 * enough to read from three metres away.
 *
 * Games with real TV-specific staging (Drawful, and — as of this pass —
 * Buzz In: Trivia/Name That Tune, Fibbage, Centre Stage) ship their own
 * TvView. Everything else falls through to GenericBoard below, which is
 * built to never look inert: the game's own accent color and tile motif,
 * a live "who buzzed / how many have answered" readout, and a running
 * clock, so a TV nobody's specifically designed for still feels like part
 * of the room instead of a blank laptop lid.
 */
export function TvRoom() {
  const { room, round, call } = useRoom();

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

  return <GenericBoard />;
}

function GenericBoard() {
  const { round, items, submissions, votes, events } = useRoom();
  const { roster } = usePlayer();

  const cursor = round?.item_cursor ?? 0;
  const accent = round ? (TILE_ACCENT[round.game] ?? "var(--color-flame)") : "var(--color-flame)";
  const game = round ? gameById(round.game) : undefined;

  const total = useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
  const publicItems = useMemo(
    () => items.filter((i) => i.idx === cursor && i.visible_to === null),
    [items, cursor],
  );

  const answeredIds = useMemo(
    () => new Set(submissions.filter((s) => s.idx === cursor).map((s) => s.player_id)),
    [submissions, cursor],
  );
  const votedIds = useMemo(
    () => new Set(votes.filter((v) => v.idx === cursor).map((v) => v.player_id)),
    [votes, cursor],
  );
  const progressCount = votedIds.size || answeredIds.size;
  const progressLabel = votedIds.size > 0 ? "voted" : "answered";

  // "Someone did something first" — the exact primitive Buzz In, Contact and
  // Paranoia's coin flip all already share (round_events, migration 0008).
  // Flashing whoever's most recent here is what makes a buzzer round land
  // on the TV instead of only on the winner's own phone.
  const lastEvent = useMemo(() => {
    const here = events.filter((e) => e.idx === cursor);
    return here.length ? here[here.length - 1] : null;
  }, [events, cursor]);
  const lastEventPlayer = roster.find((p) => p.id === lastEvent?.player_id);
  const eventVerb: Record<string, string> = {
    buzz: "buzzed first!",
    block: "blocked!",
    contact: "has a contact!",
    coin_flip: "flipped the coin!",
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = round?.started_at
    ? Math.max(0, Math.floor((now - new Date(round.started_at).getTime()) / 1000))
    : null;

  if (!round) return null;

  return (
    <main className="relative grid min-h-dvh grid-cols-[1fr_360px] gap-8 overflow-hidden p-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in oklab, ${accent} 30%, transparent), transparent 65%)`,
        }}
      />
      <TileMotif
        gameId={round.game}
        className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[560px] w-[560px] opacity-[0.08]"
      />

      <section className="flex flex-col items-center justify-center gap-7 text-center">
        <div className="rise flex items-center gap-4">
          <span className="text-5xl">{game?.icon}</span>
          <div className="text-left">
            <p
              className="text-3xl font-black uppercase tracking-[0.12em]"
              style={{ color: accent }}
            >
              {game?.title ?? round.game}
            </p>
            {total > 1 && (
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-mute">
                {cursor + 1} of {total}
              </p>
            )}
          </div>
        </div>

        {publicItems.length > 0 ? (
          publicItems.map((i) =>
            i.kind === "drawing" ? null : (
              <p key={i.id} className="rise max-w-4xl text-5xl font-black leading-tight">
                {i.content}
              </p>
            ),
          )
        ) : (
          <p className="text-3xl font-bold text-mute">Look at your phones.</p>
        )}

        {lastEvent && lastEventPlayer && (
          <div
            key={lastEvent.id}
            className="rise flex items-center gap-3 rounded-full border-2 px-8 py-4"
            style={{
              borderColor: accent,
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              boxShadow: `0 0 48px color-mix(in oklab, ${accent} 45%, transparent)`,
            }}
          >
            <span className="text-3xl">{lastEventPlayer.emoji}</span>
            <span className="text-2xl font-black" style={{ color: accent }}>
              {lastEventPlayer.name} {eventVerb[lastEvent.kind] ?? "went!"}
            </span>
          </div>
        )}

        {progressCount > 0 && (
          <div className="flex items-center gap-2">
            {roster.map((p, i) => (
              <span
                key={p.id}
                className="h-3 w-3 rounded-full transition-all duration-500"
                style={{
                  background: i < progressCount ? accent : "var(--color-ink-3)",
                  transitionDelay: `${i * 40}ms`,
                }}
              />
            ))}
            <span className="ml-2 text-sm font-bold uppercase tracking-wider text-mute">
              {progressCount} {progressLabel}
            </span>
          </div>
        )}

        {elapsed !== null && (
          <p className="font-mono text-sm tabular-nums text-mute">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")} on the clock
          </p>
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
  // This is a static export — the HTML below is generated once at build
  // time, with no `window`, then hydrated in the browser where `window`
  // very much exists. Reading it straight in the render body (the old
  // `typeof window !== "undefined"` check) makes the server and the
  // client render two different trees for the same pass, which is exactly
  // what React's hydration-mismatch warning is for. Starting at "" and
  // filling it in from an effect keeps the FIRST client render identical
  // to the server's, then updates a beat later — no mismatch, just a QR
  // code that appears a moment after the rest of the idle screen.
  const [url, setUrl] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? ""));
  }, []);

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
