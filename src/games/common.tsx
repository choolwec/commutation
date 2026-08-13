"use client";

import { useMemo } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";

/**
 * Shared bits for the group's own invented rounds (docs/THEIR_ROUNDS.md).
 *
 * The sixteen games that shipped first each redefined `useTotalItems` and a
 * shuffle in their own file — fine at one or two, silly at nine more. Four
 * of the new rounds are also built on the same two shapes the spec kept
 * asking for:
 *
 *   · a turn pointer round a circle (Clap Circle, Question Volley)
 *   · "tap people in the order they went out", scored by finishing position
 *     (Clap Circle, Speed Cards)
 *
 * so those live here once rather than twice each. Everything here is
 * presentational or pure — no RPC calls, so a game keeps owning its own
 * dealing and scoring, same as the GameModule contract intends.
 */

export type Seat = { id: string; name: string; emoji: string; color: string };

/** Everyone actually holding a profile, in the roster's fixed seat order. */
export function useSeats(): Seat[] {
  const { roster } = usePlayer();
  return useMemo(
    () =>
      roster
        .filter((p) => p.claimed_by)
        .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color })),
    [roster],
  );
}

/** How many distinct items this round holds — the "card 3 of 8" denominator. */
export function useTotalItems(): number {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/**
 * Points for finishing Nth of M, on the same 100-a-place ladder for both
 * elimination rounds — but pointed in opposite directions, because the two
 * games mean opposite things by "out":
 *
 *   · Clap Circle — out is eliminated. Last one standing wins, so the first
 *     person tapped gets the least.  (firstBest: false)
 *   · Speed Cards — out is having shed your last card. Going out first IS
 *     winning, so the first person tapped gets the most.  (firstBest: true)
 *
 * Getting this backwards would silently invert a whole round's leaderboard,
 * which is exactly why it's one function with an explicit flag rather than
 * two similar-looking expressions in two files.
 */
export function finishPoints(place: number, total: number, firstBest: boolean): number {
  const rank = firstBest ? place : total - 1 - place;
  return Math.max(50, (total - rank) * 100);
}

/** A round face, sized for a ring of six on a phone. */
export function Face({
  seat,
  size = 44,
  dim,
  ring,
  label,
}: {
  seat: Seat;
  size?: number;
  dim?: boolean;
  ring?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ opacity: dim ? 0.3 : 1 }}>
      <div
        className="grid place-items-center rounded-full border-2 transition-all duration-300"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          borderColor: ring ?? "var(--color-line)",
          background: ring ? `color-mix(in oklab, ${ring} 22%, transparent)` : "var(--color-ink-2)",
          boxShadow: ring ? `0 0 18px color-mix(in oklab, ${ring} 45%, transparent)` : undefined,
        }}
      >
        {seat.emoji}
      </div>
      <span className="max-w-[64px] truncate text-[10px] font-bold text-mute">
        {label ?? seat.name}
      </span>
    </div>
  );
}

/**
 * The seats laid out as an actual ring, with one highlighted. Worth the
 * trigonometry rather than a list: both games that use it are played sitting
 * in a circle, and "the pointer is two to your left" is instant on a ring
 * and needs counting on a list.
 */
export function SeatRing({
  seats,
  activeId,
  outIds,
  accent,
  children,
}: {
  seats: Seat[];
  activeId?: string | null;
  outIds?: string[];
  accent: string;
  children?: React.ReactNode;
}) {
  const out = new Set(outIds ?? []);
  const n = Math.max(seats.length, 1);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <div
        className="absolute inset-6 rounded-full border border-dashed"
        style={{ borderColor: `color-mix(in oklab, ${accent} 35%, transparent)` }}
      />
      <div className="absolute inset-0 grid place-items-center px-10 text-center">
        {children}
      </div>
      {seats.map((seat, i) => {
        // Start at the top and go clockwise, so the ring on screen matches
        // the roster order everyone can also see on the leaderboard.
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <div
            key={seat.id}
            className="absolute"
            style={{
              left: `${50 + 43 * Math.cos(angle)}%`,
              top: `${50 + 43 * Math.sin(angle)}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Face
              seat={seat}
              size={40}
              dim={out.has(seat.id)}
              ring={seat.id === activeId ? accent : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Tap whoever just went out." Elimination order IS the score — no persisted
 * alive/dead table anywhere, exactly as THEIR_ROUNDS §0 concluded — so this
 * pays each player the moment they're tapped and hands the last one standing
 * the top prize when the host closes it out.
 */
export function KnockOutList({
  seats,
  out,
  accent,
  prompt,
  firstBest,
  onOut,
}: {
  seats: Seat[];
  out: string[];
  accent: string;
  /** What tapping someone MEANS here — the two games disagree, see finishPoints. */
  prompt: string;
  firstBest: boolean;
  onOut: (id: string) => void;
}) {
  const gone = new Set(out);
  const standing = seats.filter((s) => !gone.has(s.id));
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">
          {prompt}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {standing.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onOut(s.id)}
              className="flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition active:scale-95"
              style={{
                borderColor: `color-mix(in oklab, ${accent} 40%, var(--color-line))`,
                background: `color-mix(in oklab, ${accent} 8%, var(--color-ink-2))`,
              }}
            >
              <span className="text-xl">{s.emoji}</span>
              <span className="truncate text-[11px] font-bold">{s.name}</span>
            </button>
          ))}
          {standing.length === 0 && (
            <p className="col-span-3 text-center text-xs text-mute">That&apos;s everyone.</p>
          )}
        </div>
      </div>

      {out.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">
            In order
          </p>
          <ol className="space-y-1">
            {out.map((id, i) => {
              const seat = seats.find((s) => s.id === id);
              if (!seat) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-1.5 text-xs"
                >
                  <span className="w-4 text-mute">{i + 1}</span>
                  <span>{seat.emoji}</span>
                  <span className="flex-1 font-semibold">{seat.name}</span>
                  <span className="font-bold text-mute">
                    +{finishPoints(i, seats.length, firstBest)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
