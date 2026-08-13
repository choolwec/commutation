"use client";

import { useEffect } from "react";

/**
 * Keeps the screen from locking while a room is active. Rounds run for
 * minutes at a stretch with people not actively tapping (Paranoia,
 * charades-style rounds, anyone just watching) — without this, phones lock
 * mid-round.
 *
 * The Wake Lock API silently releases itself the moment a tab backgrounds
 * (app switch, lock button, some browsers even on scroll) — re-acquiring on
 * `visibilitychange` isn't optional, it's how the lock comes back the
 * instant someone returns instead of the screen staying free to sleep again
 * for the rest of the round.
 *
 * Unsupported/denied is silently a no-op: this degrades to normal screen
 * timeout behavior, not a broken game, so nothing here surfaces an error.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let released = false;

    async function acquire() {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (released) {
          void l.release().catch(() => {});
          return;
        }
        lock = l;
        l.addEventListener("release", () => {
          if (lock === l) lock = null;
        });
      } catch {
        // Denied (low battery, unsupported) — fine, just no lock.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible" && !lock) void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) {
        void lock.release().catch(() => {});
        lock = null;
      }
    };
  }, [active]);
}
