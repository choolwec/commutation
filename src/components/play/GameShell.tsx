"use client";

import { useState, type ReactNode } from "react";
import { useRoom } from "@/lib/game/room";
import { RULES } from "@/games/rules";

/**
 * The frame every PhoneView renders inside. Keeps the visual language
 * consistent with Stage 1 (Hub.tsx's card/section rhythm) without every game
 * re-deriving it, and gives the host controls a fixed dock above the home
 * indicator — see globals.css's `.dock`, built for exactly this.
 *
 * Also the one place that renders the rules affordance (the "?" below) —
 * every one of the 16 games already renders through here, so this is the
 * single spot that fixes "nothing explains the game" for all of them at
 * once, rather than six one-off additions. It reads round.game (already
 * available via useRoom(), same as everything else here) rather than taking
 * a prop, so no existing GameShell call site needs to change.
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
  const gameId = round?.game;
  const rules = gameId ? RULES[gameId] : undefined;

  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh max-w-md flex-col px-5 pad-safe-t">
      <header className="rise">
        <div className="flex items-center gap-2">
          <p className="flex flex-1 items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-mute">
            <span className="text-base">{icon}</span> {title}
          </p>
          {gameId && rules && (
            <RulesButton gameId={gameId} title={title} icon={icon} rules={rules} />
          )}
        </div>
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

const RULES_SEEN_PREFIX = "commutation:rules-seen:";

/**
 * The "?" affordance itself. Opens automatically the first time this phone
 * hits a round for this game THIS SESSION (sessionStorage, not localStorage
 * — a fresh tab tomorrow should explain itself again), and stays reachable
 * afterward so someone can re-check mid-round without asking the room.
 *
 * The auto-open is a lazy useState initializer rather than an effect: React
 * already remounts this component fresh whenever the active game changes
 * (PlayRoom swaps `game.PhoneView` to a different component), so "first
 * render for this gameId" and "first time seeing this game this session"
 * are the same event — no effect needed to detect it.
 */
function RulesButton({
  gameId,
  title,
  icon,
  rules,
}: {
  gameId: string;
  title: string;
  icon: string;
  rules: string[];
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const key = RULES_SEEN_PREFIX + gameId;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`How to play ${title}`}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-[11px] font-black text-mute transition active:scale-90"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm pad-safe-b"
          onClick={() => setOpen(false)}
        >
          <div
            className="rise w-full max-w-md rounded-t-3xl border-t border-line bg-ink-2 p-6 pad-safe-b"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <span className="text-lg">{icon}</span> {title}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-paper/90">
              {rules.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-mute">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-2xl bg-flame px-5 py-3 text-center text-sm font-black text-ink transition active:brightness-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
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
