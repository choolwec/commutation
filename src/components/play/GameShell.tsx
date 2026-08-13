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
 *
 * Header typography (P3 layout pass): Hub.tsx's own convention is a small
 * tracked-out eyebrow paired with a bold text-lg headline underneath (see
 * its venue/countdown cards). This file had the game's actual title —
 * "Truth or Dare", "Know Me Best" — rendered AS the tiny muted eyebrow,
 * with no headline anywhere. Flipped: title is now the headline, subtitle
 * takes the eyebrow treatment.
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

  // Lifted out of the header on purpose: `header` carries the `rise`
  // animation, and for the ~0.5s that's in flight its computed `transform`
  // isn't `none` — which makes it a containing block for any `position:
  // fixed` descendant (CSS spec, not a Tailwind quirk). The rules sheet
  // auto-opens on first mount, i.e. exactly while that animation is
  // playing, so it was rendering pinned to the animating header's box
  // instead of the viewport — squashed into the top of the screen instead
  // of a bottom sheet. Rendering it as a sibling of `header` instead of a
  // descendant keeps its fixed positioning honest.
  const [rulesOpen, setRulesOpen] = useState(() => {
    if (!gameId || !rules || typeof window === "undefined") return false;
    const key = RULES_SEEN_PREFIX + gameId;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  });

  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh max-w-md flex-col px-5 pad-safe-t">
      <header className="rise">
        <div className="flex items-center gap-2">
          <p className="flex flex-1 items-center gap-2 text-lg font-black leading-tight tracking-tight">
            <span className="text-xl">{icon}</span> {title}
          </p>
          {gameId && rules && (
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              aria-label={`How to play ${title}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-xs font-black text-mute transition active:scale-90"
            >
              ?
            </button>
          )}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-mute">
            {subtitle}
          </p>
        )}
        {round && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-3">
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

      {gameId && rules && rulesOpen && (
        <RulesSheet gameId={gameId} title={title} icon={icon} rules={rules} onClose={() => setRulesOpen(false)} />
      )}
    </main>
  );
}

const RULES_SEEN_PREFIX = "commutation:rules-seen:";

/**
 * The rules affordance's content. Reachable any time via GameShell's "?" so
 * someone can re-check mid-round without asking the room, and shown once
 * automatically per game per session — see GameShell's rulesOpen state and
 * the comment on why this renders as its sibling, not its descendant.
 */
function RulesSheet({
  gameId,
  title,
  icon,
  rules,
  onClose,
}: {
  gameId: string;
  title: string;
  icon: string;
  rules: string[];
  onClose: () => void;
}) {
  return (
    <div
      key={gameId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm pad-safe-b"
      onClick={onClose}
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
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-flame px-5 py-3 text-center text-sm font-black text-ink transition active:brightness-90"
        >
          Got it
        </button>
      </div>
    </div>
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
