"use client";

import type { ReactNode } from "react";
import { useRoom } from "@/lib/game/room";

/**
 * The frame every PhoneView renders inside. Keeps the visual language
 * consistent with Stage 1 (Hub.tsx's card/section rhythm) without every game
 * re-deriving it, and gives the host controls a fixed dock above the home
 * indicator — see globals.css's `.dock`, built for exactly this.
 */
export function GameShell({
  icon,
  title,
  subtitle,
  children,
  dock,
}: {
  icon: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  dock?: ReactNode;
}) {
  const { round } = useRoom();

  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh max-w-md flex-col px-5 pad-safe-t">
      <header className="rise">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          <span className="text-base">{icon}</span> {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-sm text-mute">{subtitle}</p>
        )}
        {round && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-3">
            <div
              className="h-full bg-flame transition-all duration-300"
              style={{
                width:
                  round.phase === "lobby"
                    ? "10%"
                    : round.phase === "play"
                      ? "40%"
                      : round.phase === "vote"
                        ? "65%"
                        : round.phase === "reveal"
                          ? "90%"
                          : "100%",
              }}
            />
          </div>
        )}
      </header>

      <div className="mt-6 flex-1 pb-6">{children}</div>

      {dock && <div className="dock -mx-5 px-5">{dock}</div>}
    </main>
  );
}

/** A round's shared content — the confession text, the trivia question, etc. */
export function ContentCard({ children }: { children: ReactNode }) {
  return (
    <div className="rise rounded-3xl border border-line bg-ink-2 p-6 text-center text-lg font-bold leading-snug">
      {children}
    </div>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`w-full rounded-2xl bg-flame px-5 py-4 text-center text-base font-black tracking-tight text-ink transition active:brightness-90 disabled:opacity-40 ${className ?? ""}`}
    />
  );
}

export function GhostButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`w-full rounded-2xl border border-line px-5 py-3 text-center text-sm font-bold text-paper transition active:scale-[0.98] disabled:opacity-40 ${className ?? ""}`}
    />
  );
}

/** Everyone but the host sees this while waiting for them to advance. */
export function WaitingOnHost({ label }: { label: string }) {
  return (
    <div className="rise flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-8 text-center">
      <div className="h-2 w-2 animate-pulse rounded-full bg-flame" />
      <p className="text-sm text-mute">{label}</p>
    </div>
  );
}
