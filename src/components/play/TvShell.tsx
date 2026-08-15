"use client";

import type { ReactNode } from "react";
import { TileMotif } from "@/games/tileArt";
import { Leaderboard } from "./Leaderboard";

/**
 * THE TV FRAME — one layout every bespoke TvView renders inside.
 *
 * By the time four games had their own TV board, they'd each grown the same
 * forty lines: the two-column grid, the accent wash across the top, the
 * leaderboard rail, the eyebrow with the game's icon. That's GameShell's
 * job on the phone side, and this is the same idea for the screen — a game's
 * TvView should only describe its STAGE, not re-derive the furniture around
 * it.
 *
 * Deliberately not merged into GameShell: the two have nothing in common
 * beyond a header. A phone frame is a scrolling column with a thumb-reach
 * dock and a rules sheet; a TV frame is a fixed 16:9 board with a
 * leaderboard rail and no input at all. Sharing one component would mean a
 * pile of `isTv` branches in both directions.
 *
 * `rail={false}` drops the leaderboard for the games whose whole point is a
 * single quiet centred moment (Paranoia) — a scoreboard next to that would
 * undercut it.
 */
export function TvShell({
  icon,
  title,
  accent,
  meta,
  gameId,
  rail = true,
  children,
}: {
  icon: string;
  title: string;
  accent: string;
  /** Small line under the title — "Confession 3 of 6". */
  meta?: ReactNode;
  /** Draws that game's tileArt motif as a faint watermark. */
  gameId?: string;
  rail?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`relative min-h-dvh overflow-hidden p-10 ${
        rail ? "grid grid-cols-[1fr_360px] gap-8" : "grid place-items-center"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in oklab, ${accent} 26%, transparent), transparent 65%)`,
        }}
      />
      {gameId && (
        <TileMotif
          gameId={gameId}
          className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[560px] w-[560px] opacity-[0.07]"
        />
      )}

      <section className="flex flex-col items-center justify-center gap-7 text-center">
        <div className="rise flex items-center gap-4">
          <span className="text-5xl">{icon}</span>
          <div className="text-left">
            <p
              className="text-3xl font-black uppercase tracking-[0.12em]"
              style={{ color: accent }}
            >
              {title}
            </p>
            {meta && (
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-mute">
                {meta}
              </p>
            )}
          </div>
        </div>
        {children}
      </section>

      {rail && (
        <aside className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-mute">
            Leaderboard
          </p>
          <Leaderboard />
        </aside>
      )}
    </main>
  );
}

/**
 * The "someone just did something, look up" pill — a buzz, a block, a
 * caught contact. Big, glowing, and the same shape in every game so the
 * room learns to read it at a glance from across the room.
 */
export function TvFlash({
  accent,
  emoji,
  children,
}: {
  accent: string;
  emoji?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rise flex items-center gap-3 rounded-full border-2 px-8 py-4"
      style={{
        borderColor: accent,
        background: `color-mix(in oklab, ${accent} 18%, transparent)`,
        boxShadow: `0 0 48px color-mix(in oklab, ${accent} 45%, transparent)`,
      }}
    >
      {emoji && <span className="text-3xl">{emoji}</span>}
      <span className="text-2xl font-black" style={{ color: accent }}>
        {children}
      </span>
    </div>
  );
}

/**
 * NO "4 of 6 have answered" COMPONENT LIVES HERE, deliberately.
 *
 * It was written, and it was wrong: submissions and votes are sealed to
 * their own author until the host opens them (0005's two `… are yours
 * until revealed` policies), and /tv claims no profile at all, so
 * `my_player_id()` is null for this client. A progress counter on the TV
 * therefore reads a confident, permanent 0 no matter how many people have
 * actually answered — worse than showing nothing, because the room
 * believes it.
 *
 * If a live "who's still typing" indicator is ever wanted on the screen,
 * it needs a SECURITY DEFINER function returning COUNTS ONLY (never
 * content, per HANDOFF §2), plus polling — realtime can't help, since
 * Postgres filters the events this client isn't allowed to see. Until
 * then the boards say what's happening in words instead.
 */

/** The person-reveal card — used wherever a round ends by naming someone. */
export function TvPersonCard({
  emoji,
  name,
  caption,
  color,
}: {
  emoji: string;
  name: string;
  caption: string;
  color: string;
}) {
  return (
    <div
      className="rise inline-flex flex-col items-center gap-3 rounded-[2rem] border-2 px-14 py-10"
      style={{
        borderColor: color,
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
        boxShadow: `0 0 64px color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      <span className="text-7xl">{emoji}</span>
      <span className="text-5xl font-black tracking-tight">{name}</span>
      <span className="text-sm font-bold uppercase tracking-[0.3em] text-mute">
        {caption}
      </span>
    </div>
  );
}
