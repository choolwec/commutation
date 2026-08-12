"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The current time, as an external store rather than a value read directly
 * during render — `Date.now()` is impure, and Countdown.tsx already hit this
 * exact wall (see its comment). `useSyncExternalStore`'s snapshot function is
 * the sanctioned place to read an impure/external source; reading the clock
 * anywhere else in a component body is what the React Compiler flags.
 *
 * `getServerSnapshot` returns null so SSR/static export has no clock to
 * disagree with — callers get `null` until the first client tick.
 */
export function useNow(intervalMs = 1000): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const t = setInterval(onChange, intervalMs);
      return () => clearInterval(t);
    },
    [intervalMs],
  );

  return useSyncExternalStore(
    subscribe,
    () => Date.now(),
    () => null,
  );
}
