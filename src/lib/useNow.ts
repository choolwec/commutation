"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * The current time, as an external store rather than a value read directly
 * during render — `Date.now()` is impure, and Countdown.tsx already hit this
 * exact wall (see its comment). `useSyncExternalStore`'s snapshot function is
 * the sanctioned place to read an impure/external source; reading the clock
 * anywhere else in a component body is what the React Compiler flags.
 *
 * `getServerSnapshot` returns null so SSR/static export has no clock to
 * disagree with — callers get `null` until the first client tick.
 *
 * THE SNAPSHOT MUST BE CACHED, and this is why:
 *
 * The first version of this hook passed `() => Date.now()` straight in as
 * getSnapshot. React calls getSnapshot on every render and compares the
 * result to the last one with Object.is to decide whether the store has
 * changed — so a snapshot that returns a fresh number every call reports
 * "changed" every single time, and every re-render schedules another one.
 * That's an unbounded render loop, not a warning: React eventually throws
 * "Maximum update depth exceeded" and the screen dies.
 *
 * The only caller is RoomProvider, which every phone in /play and /tv sits
 * inside all day, so this would have taken the whole game console down on
 * the day. It survived undetected because /preview (and therefore
 * `npm run shots`) mocks RoomContext directly rather than mounting
 * RoomProvider — the one screen in the app that never renders this hook is
 * the screen the UI was being reviewed on.
 *
 * So: the clock is read ONLY on an interval tick, into a ref, and
 * getSnapshot just hands back whatever's in the ref. Same value between
 * ticks, Object.is holds, no loop. The initial read is lazy inside
 * getSnapshot so that callers get a real timestamp on their very first
 * render rather than a null that would briefly report the room as locked.
 */
export function useNow(intervalMs = 1000): number | null {
  const cached = useRef<number | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const t = setInterval(() => {
        cached.current = Date.now();
        onChange();
      }, intervalMs);
      return () => clearInterval(t);
    },
    [intervalMs],
  );

  const getSnapshot = useCallback(() => {
    if (cached.current === null) cached.current = Date.now();
    return cached.current;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
