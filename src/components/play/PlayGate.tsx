"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { EVENT } from "@/config/event";
import { Countdown } from "@/components/Countdown";

/**
 * Everything behind "the day has actually started".
 *
 * `unlocked` reads `game_room.unlocked_at` — the one clock all six phones
 * and the TV agree on, set server-side, never trusted from a device's own
 * clock (see room.tsx). This component's only job before that timestamp
 * exists is to nudge it into existence the instant the countdown is real,
 * and to offer the bypass code as an escape hatch if plans shift.
 */
export function PlayGate({ children }: { children: React.ReactNode }) {
  const { me } = usePlayer();
  const { unlocked, loading, call } = useRoom();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Any phone can be the one that flips the switch — first to notice wins,
  // and open_room_if_due() checks the SERVER's clock, so a phone with the
  // wrong date can't jump the gun.
  useEffect(() => {
    if (unlocked) return;
    const tick = () => {
      void call("open_room_if_due", { p_due: EVENT.unlocksAt.toISOString() });
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [unlocked, call]);

  async function tryCode() {
    if (!code.trim()) return;
    setBusy(true);
    setFailed(false);
    try {
      const ok = await call("unlock_with_code", { p_code: code.trim() });
      if (!ok) setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-line border-t-flame motion-safe:animate-spin" />
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 pad-safe-t pad-safe-b text-center">
        <p className="rise text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          The Vault, The Huddle, The Arena
        </p>
        <div className="rise" style={{ animationDelay: "60ms" }}>
          <Countdown />
        </div>
        <p className="rise text-sm leading-relaxed text-mute" style={{ animationDelay: "120ms" }}>
          Everything unlocks at once, for everyone, the moment the countdown
          hits zero — {me?.name ?? "you"} included.
        </p>

        <details className="rise w-full pt-6" style={{ animationDelay: "180ms" }}>
          <summary className="cursor-pointer text-xs font-medium text-mute underline underline-offset-4">
            Plans changed? Force it open early.
          </summary>
          <div className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="bypass code"
              className="flex-1 rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none focus:border-flame/60"
            />
            <button
              type="button"
              disabled={busy}
              onClick={tryCode}
              className="rounded-2xl bg-flame px-5 py-3 text-sm font-bold text-ink active:brightness-90 disabled:opacity-50"
            >
              Go
            </button>
          </div>
          {failed && <p className="mt-2 text-xs text-flame">That code didn&apos;t work.</p>}
        </details>
      </main>
    );
  }

  return <>{children}</>;
}
