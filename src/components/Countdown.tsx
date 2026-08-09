"use client";

import { useCallback, useSyncExternalStore } from "react";
import { EVENT } from "@/config/event";

type Parts = { d: number; h: number; m: number; s: number; done: boolean };

function split(target: Date, now: number): Parts {
  const ms = target.getTime() - now;
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: false,
  };
}

function Cell({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="tabular-nums text-4xl font-black tracking-tight sm:text-6xl"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {String(n).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">
        {label}
      </div>
    </div>
  );
}

export function Countdown() {
  // The clock is an external source of truth, so it's read through
  // useSyncExternalStore rather than mirrored into state by an effect.
  // getServerSnapshot returns null, which is what makes this hydration-safe:
  // the server renders a placeholder and the real time appears after mount,
  // with no mismatch and no cascading render on every tick.
  const subscribe = useCallback((onChange: () => void) => {
    const t = setInterval(onChange, 1000);
    return () => clearInterval(t);
  }, []);

  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

  if (now === null) {
    return <div className="h-[72px] sm:h-[92px]" aria-hidden />;
  }

  const p = split(EVENT.unlocksAt, now);

  if (p.done) {
    return (
      <div className="text-center">
        <div className="text-4xl font-black tracking-tight text-flame sm:text-6xl">
          IT&apos;S TIME
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start justify-center gap-4 sm:gap-8"
      role="timer"
      aria-label={`Time until ${EVENT.dateLabel}`}
    >
      <Cell n={p.d} label="days" />
      <Cell n={p.h} label="hrs" />
      <Cell n={p.m} label="min" />
      <Cell n={p.s} label="sec" />
    </div>
  );
}
