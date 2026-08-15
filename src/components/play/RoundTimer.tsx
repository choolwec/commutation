"use client";

import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/lib/game/room";
import { sound } from "@/lib/sound";

/**
 * Counts down from `round.started_at`, not from a local setTimeout.
 *
 * Six phones each running their own timer drift apart within a round — one
 * says 3 seconds left, another says 0, and whoever's screen is "right" is
 * arbitrary. Reading from the same server timestamp means every phone (and
 * the TV) agrees, and a phone that reconnects mid-round shows the correct
 * remaining time instead of restarting from full.
 *
 * `from` overrides which server timestamp that is. round.started_at is the
 * right default — set_phase/set_cursor stamp it, so the clock restarts when
 * the round moves. But 30 Seconds' clock starts when the DESCRIBER taps go,
 * not when the host deals the card, and that moment is a round_events row
 * (public, self-inserted) rather than a phase change. Same drift-proofing
 * either way: still one server timestamp every phone counts down to, never
 * a local one.
 */
export function RoundTimer({
  seconds,
  from,
  onExpire,
  className,
}: {
  seconds: number;
  from?: string | null;
  onExpire?: () => void;
  className?: string;
}) {
  const { round, isHost } = useRoom();
  const [remaining, setRemaining] = useState(seconds);
  const startedAt = from ?? round?.started_at;
  // Every phone (and the TV) counts down from the same server timestamp, so
  // every device crosses each integer second at the same moment — the tick
  // plays on all of them, which is the point for the last few seconds of a
  // shared clock. Tracks the last second it fired for so the 250ms poll
  // below doesn't replay it several times while sitting inside one second.
  const lastTicked = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    lastTicked.current = null;

    const tick = () => {
      const left = Math.max(0, seconds - (Date.now() - start) / 1000);
      setRemaining(left);
      const whole = Math.ceil(left);
      if (whole > 0 && whole <= 3 && whole !== lastTicked.current) {
        lastTicked.current = whole;
        sound.tick();
      }
      return left;
    };

    tick();
    const id = setInterval(() => {
      const left = tick();
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [startedAt, seconds]);

  // Only the host's phone drives phase transitions, so the room only ever
  // gets one "time's up" call rather than six racing each other. The RPC
  // underneath (set_phase) is idempotent regardless.
  useEffect(() => {
    if (!isHost || !onExpire || remaining > 0) return;
    onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, remaining <= 0]);

  const low = remaining <= 10;
  return (
    <div
      className={`font-black tabular-nums ${low ? "text-flame" : ""} ${className ?? ""}`}
    >
      {Math.ceil(remaining)}s
    </div>
  );
}
