"use client";

import { useRoom } from "@/lib/game/room";

/**
 * Persistent, always visible, crown on #1 — per PLAN.md's "systems running
 * underneath all day." Reads the `leaderboard` view, so it can never disagree
 * with the ledger in `scores`.
 */
export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const { leaderboard } = useRoom();

  if (leaderboard.length === 0) return null;

  const top = leaderboard[0]?.points ?? 0;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {leaderboard.map((p, i) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-2.5"
        >
          <span className="w-5 text-center text-xs font-bold text-mute">
            {i === 0 && p.points > 0 ? "👑" : i + 1}
          </span>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm"
            style={{ background: `${p.color}22` }}
          >
            {p.emoji}
          </span>
          <span className="flex-1 truncate text-sm font-semibold">
            {p.name}
          </span>
          <span
            className="text-sm font-black tabular-nums"
            style={{ color: p.points > 0 ? p.color : undefined }}
          >
            {p.points}
          </span>
          {!compact && top > 0 && (
            <div className="h-1 w-14 overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(4, (p.points / top) * 100)}%`,
                  background: p.color,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
