"use client";

import { useMemo } from "react";
import { useRoom } from "@/lib/game/room";
import { usePlayer } from "@/lib/player";
import type { GameViewProps } from "@/lib/game/types";
import { Leaderboard } from "@/components/play/Leaderboard";

const GLOW = "#f97316";

// The same crayon squiggle as the Launcher tile (src/games/tileArt.tsx),
// kept as a literal here rather than imported — tileArt's motifs are sized
// for a small tile viewBox, and this one only needs to sit as a big, quiet
// watermark behind the stage.
const SQUIGGLE = "M14 78C34 40 40 76 54 50S78 18 90 24";

/**
 * DRAWFUL'S BIG SCREEN — the first bespoke TvView (HANDOFF §12 flagged this
 * as the highest-value gap: every Arena game fell back to TvRoom.tsx's
 * generic "public content + leaderboard" board).
 *
 * Mirrors PhoneView's own phase gating exactly (index.tsx only reveals the
 * drawing image once phase is 'vote' or later) rather than showing it the
 * moment it's technically readable — the host's "Drawing's in → everyone
 * titles it" tap is the drumroll this game is built around, and the TV
 * shouldn't spoil it for whoever glances up before their own phone does.
 */
export function DrawfulTv({ round }: GameViewProps) {
  const { items, submissions, votes, secrets } = useRoom();
  const { roster } = usePlayer();

  const cursor = round.item_cursor;
  const total = useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);

  const drawing = submissions.find((s) => s.idx === cursor && s.kind === "drawing");
  const titles = submissions.filter((s) => s.idx === cursor && s.kind === "lie");
  const votesHere = votes.filter((v) => v.idx === cursor);
  const secret = secrets.find((s) => s.idx === cursor);
  const truthId = secret?.payload?.truth_submission as string | undefined;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const artist = roster.find((p) => p.id === drawing?.player_id);

  return (
    <main
      className="relative grid min-h-dvh grid-cols-[1fr_360px] gap-8 overflow-hidden p-10"
      style={{ background: `radial-gradient(circle at 50% 0%, ${GLOW}14, transparent 70%)` }}
    >
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute -bottom-16 -right-16 h-[440px] w-[440px] opacity-[0.06]"
        style={{ color: GLOW }}
        aria-hidden
      >
        <path d={SQUIGGLE} stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" />
      </svg>

      <section className="relative z-[1] flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-2xl font-black uppercase tracking-[0.3em]" style={{ color: GLOW }}>
          🖍️ Drawful — Turn {cursor + 1} of {total}
        </p>

        {!revealed && round.phase !== "vote" && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-3 w-3 animate-pulse rounded-full" style={{ background: GLOW }} />
            <p className="text-3xl font-bold text-mute">
              Someone&apos;s drawing something ridiculous right now.
            </p>
          </div>
        )}

        {round.phase === "vote" && drawing && (
          <>
            <img
              src={drawing.value}
              alt="the drawing"
              className="rise w-full max-w-xl rounded-3xl border-4"
              style={{ borderColor: GLOW }}
            />
            <p className="text-xl font-bold text-mute">
              {titles.length === 0
                ? "Titles are coming in on every phone…"
                : `${titles.length} title${titles.length === 1 ? "" : "s"} in so far.`}
            </p>
          </>
        )}

        {revealed && drawing && (
          <div className="rise flex w-full max-w-2xl flex-col items-center gap-5">
            <img
              src={drawing.value}
              alt="the drawing"
              className="w-full max-w-md rounded-3xl border-4"
              style={{ borderColor: GLOW }}
            />
            <div className="w-full space-y-2">
              {titles.map((s) => {
                const count = votesHere.filter((v) => v.value === s.id).length;
                const isTruth = s.id === truthId;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-xl font-bold ${
                      isTruth
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                        : "border-line bg-ink-2"
                    }`}
                  >
                    <span>
                      {s.value}
                      {isTruth && <span className="ml-2 text-xs uppercase">✓ the real prompt</span>}
                    </span>
                    <span className="shrink-0 text-sm font-black text-mute">
                      {count} vote{count === 1 ? "" : "s"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-mute">
              drawn by {artist ? `${artist.emoji} ${artist.name}` : "someone"}
            </p>
          </div>
        )}

        {!drawing && (round.phase === "vote" || revealed) && (
          <p className="text-2xl font-bold text-mute">Look at your phones.</p>
        )}
      </section>

      <aside className="relative z-[1] flex flex-col justify-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-mute">Leaderboard</p>
        <Leaderboard />
      </aside>
    </main>
  );
}
