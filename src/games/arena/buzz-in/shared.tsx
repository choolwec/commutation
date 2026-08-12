"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";

/**
 * BUZZ IN — shared skeleton for both variants (Trivia / Name That Tune).
 *
 * The one thing this game needs that nothing else in the app does: "someone
 * else already buzzed" has to reach every phone in well under a second, and
 * BEFORE any host reveal. Submissions/votes are deliberately sealed until
 * the host opens them — exactly wrong here. `round_events` (migration 0008)
 * exists for precisely this: always public, insert-your-own-row-only. First
 * row wins; Postgres's own insert order is the fairest arbiter of "first"
 * available without a dedicated realtime authority.
 *
 * Visual identity: a physical buzzer button — glossy, chunky, satisfying to
 * slam. Quiz-show energy, not another vote grid.
 */

export type BuzzItem = {
  content: string;
  meta: Record<string, unknown>;
};

export function useBuzzState() {
  const { me } = usePlayer();
  const { round, events } = useRoom();
  const cursor = round?.item_cursor ?? 0;

  const buzzesHere = useMemo(
    () =>
      events
        .filter((e) => e.idx === cursor && e.kind === "buzz")
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [events, cursor],
  );

  const winner = buzzesHere[0] ?? null;
  const iBuzzed = buzzesHere.some((e) => e.player_id === me?.id);
  const locked = buzzesHere.length > 0;
  const iAmWinner = winner?.player_id === me?.id;

  const [buzzing, setBuzzing] = useState(false);

  async function buzz() {
    const supabase = getSupabase();
    if (!supabase || !round || !me || locked || buzzing) return;
    setBuzzing(true);
    await supabase.from("round_events").insert({
      round_id: round.id,
      idx: cursor,
      player_id: me.id,
      kind: "buzz",
    });
    setBuzzing(false);
  }

  return { cursor, buzzesHere, winner, iBuzzed, locked, iAmWinner, buzz, buzzing };
}

export function BuzzButton({
  locked,
  iAmWinner,
  onBuzz,
  glow,
}: {
  locked: boolean;
  iAmWinner: boolean;
  onBuzz: () => void;
  /** Tailwind color token driving the button's glow — differs per variant. */
  glow: string;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onBuzz}
      className={`relative grid aspect-square w-full max-w-[220px] place-items-center rounded-full text-2xl font-black uppercase tracking-wide text-ink transition active:scale-95 disabled:active:scale-100 ${
        iAmWinner ? "animate-pulse" : ""
      }`}
      style={{
        background: locked
          ? "var(--color-ink-3)"
          : `radial-gradient(circle at 35% 30%, ${glow}, color-mix(in oklab, ${glow} 55%, black))`,
        boxShadow: locked
          ? "inset 0 6px 12px rgba(0,0,0,0.4)"
          : `0 10px 0 color-mix(in oklab, ${glow} 40%, black), 0 14px 24px color-mix(in oklab, ${glow} 50%, transparent)`,
        color: locked ? "var(--color-mute)" : "var(--color-ink)",
      }}
    >
      {iAmWinner ? "YOU!" : locked ? "locked" : "BUZZ"}
    </button>
  );
}

export function BuzzHost({
  title,
  cursor,
  total,
  glow,
  answerLabel,
  children,
  onNext,
  onFinish,
}: {
  title: string;
  cursor: number;
  total: number;
  glow: string;
  answerLabel?: string;
  children: React.ReactNode;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <GameShell
      icon="🎙️"
      title={title}
      subtitle={`Round ${cursor + 1} of ${total}`}
      dock={
        <div className="flex gap-2 pt-3">
          <PrimaryButton
            style={{ background: glow }}
            onClick={cursor >= total - 1 ? onFinish : onNext}
          >
            {cursor >= total - 1 ? "Finish round" : "Next →"}
          </PrimaryButton>
        </div>
      }
    >
      {children}
      {answerLabel && (
        <p className="rise mt-4 text-center text-xs font-bold uppercase tracking-wider text-mute">
          {answerLabel}
        </p>
      )}
    </GameShell>
  );
}

export function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

export { useCurrentItems, WaitingOnHost };
