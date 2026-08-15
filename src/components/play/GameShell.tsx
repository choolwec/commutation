"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRoom } from "@/lib/game/room";
import { RULES } from "@/games/rules";
import { sound, isMuted, setMuted } from "@/lib/sound";
import { useExit } from "./ExitContext";

// Files in public/ are copied verbatim and get no automatic rewriting — see
// layout.tsx's own BASE constant for why this has to be here too.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// The 3 games with a hero piece (docs/ART.md) worth a brief cinematic beat
// before the round itself takes over the screen. Not all 16+ games get one —
// most already have their identity carried by tileArt.tsx's tile motif, this
// is reserved for the handful worth the extra second.
const HERO_INTRO: Partial<Record<string, string>> = {
  drawful: "game-drawful",
  truth_or_dare: "game-truth-or-dare",
  clap_circle: "game-clap-circle",
};

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
  const exit = useExit();
  const [exitOpen, setExitOpen] = useState(false);

  // The hero-intro beat: shows once per round, for the 3 games listed in
  // HERO_INTRO, then gets out of the way on its own or on a tap. Tracked by
  // round id rather than a mount-once flag because this component doesn't
  // remount between two different rounds of the same game back to back.
  const heroName = gameId ? HERO_INTRO[gameId] : undefined;
  const roundId = round?.id;
  const [dismissedRound, setDismissedRound] = useState<string | null>(null);
  const showIntro = Boolean(heroName && roundId && roundId !== dismissedRound);

  useEffect(() => {
    if (!showIntro || !roundId) return;
    const t = setTimeout(() => setDismissedRound(roundId), 1800);
    return () => clearTimeout(t);
  }, [showIntro, roundId]);

  // Lifted out of the header on purpose: `header` carries the `rise`
  // animation, and for the ~0.5s that's in flight its computed `transform`
  // isn't `none` — which makes it a containing block for any `position:
  // fixed` descendant (CSS spec, not a Tailwind quirk). The rules sheet
  // auto-opens on first mount, i.e. exactly while that animation is
  // playing, so it was rendering pinned to the animating header's box
  // instead of the viewport — squashed into the top of the screen instead
  // of a bottom sheet. Rendering it as a sibling of `header` instead of a
  // descendant keeps its fixed positioning honest.
  //
  // localStorage, not sessionStorage: "the first time you ever play this
  // game" is the useful moment, and sessionStorage resets whenever the tab
  // is closed or Safari evicts it — which on a phone across a seven-hour
  // day means the sheet reappears in front of a game somebody already knows,
  // round after round. Once per game per device, then it's the "?" only.
  const [rulesOpen, setRulesOpen] = useState(() => {
    if (!gameId || !rules || typeof window === "undefined") return false;
    try {
      const key = RULES_SEEN_PREFIX + gameId;
      if (window.localStorage.getItem(key)) return false;
      window.localStorage.setItem(key, "1");
      return true;
    } catch {
      // Private-mode Safari can throw on write. Never showing the sheet
      // automatically is a better failure than showing it every round.
      return false;
    }
  });

  // Lazy initializer, not an effect — same reasoning as rulesOpen just
  // above: this only ever mounts once Gate/PlayGate have already resolved
  // real client-side data, so there's no server-rendered counterpart for a
  // synchronous localStorage read to hydration-mismatch against, and a
  // setState-in-effect here would trip the same lint rule the codebase
  // already treats as a real bug class (HANDOFF §9's typing-loss fix).
  const [muted, setMutedState] = useState(() => isMuted());
  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  // The reveal sting: fires once when THIS device observes a round actually
  // transition into 'reveal' — not on mount, and not every render while it
  // stays there. prevPhase starts as the CURRENT phase (not undefined), so
  // rejoining a round that's already revealed doesn't retroactively play the
  // sting — only watching it happen live does.
  const prevPhase = useRef(round?.phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = round?.phase;
    if (round?.phase === "reveal" && was && was !== "reveal") {
      sound.reveal();
    }
  }, [round?.phase]);

  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh max-w-md flex-col px-5 pad-safe-t">
      <header className="rise">
        <div className="flex items-center gap-2">
          <p className="flex flex-1 items-center gap-2 text-lg font-black leading-tight tracking-tight">
            <span className="text-xl">{icon}</span> {title}
          </p>
          {round && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
              aria-pressed={muted}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-xs text-mute transition active:scale-90"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          )}
          {gameId && rules && (
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              aria-label={`How to play ${title}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-xs font-black text-mute transition active:scale-90"
            >
              ?
            </button>
          )}
          {round && (
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              aria-label="Leave this round"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-sm leading-none text-mute transition active:scale-90"
            >
              ✕
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

      {exitOpen && round && (
        <ExitSheet title={title} onClose={() => setExitOpen(false)} onLeave={exit?.leave} />
      )}

      {showIntro && heroName && roundId && (
        <div
          role="button"
          aria-label={`Continue to ${title}`}
          className="rise fixed inset-0 z-50 flex flex-col justify-end bg-ink"
          onClick={() => setDismissedRound(roundId)}
        >
          <img
            src={`${BASE}/art/${heroName}.webp`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="relative bg-gradient-to-t from-ink via-ink/80 to-transparent px-6 pb-12 pt-20 text-center">
            <p className="text-2xl font-black tracking-tight">
              {icon} {title}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-mute">
              tap to continue
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * The way out of a round. Same bottom-sheet shape and same three exits as
 * RulesSheet (✕, backdrop, Escape) — see its comment; a sheet that's hard to
 * dismiss is a worse trap than the one this is here to solve.
 *
 * The two actions are deliberately weighted differently. Leaving is the safe
 * one and gets the primary button; ending the round yanks five other people
 * out of a game they might be mid-way through, so it's a quieter,
 * second-tap-to-confirm control and only appears for the host.
 */
function ExitSheet({
  title,
  onClose,
  onLeave,
}: {
  title: string;
  onClose: () => void;
  onLeave?: () => void;
}) {
  const { round, isHost, call } = useRoom();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function endRound() {
    if (!round || busy) return;
    setBusy(true);
    try {
      await call("set_phase", { p_round: round.id, p_phase: "done" });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Leave ${title}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rise flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-line bg-ink-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-start gap-3 px-6 pt-3">
          <p className="flex-1 pt-1.5 text-sm font-black uppercase tracking-wider">
            Leave {title}?
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl leading-none text-mute transition active:scale-90 active:bg-ink-3"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 pad-safe-b">
          {onLeave && (
            <>
              <button
                type="button"
                onClick={() => {
                  onLeave();
                  onClose();
                }}
                className="w-full rounded-2xl bg-flame px-5 py-4 text-center text-base font-black text-ink transition active:brightness-90"
              >
                Back to the games list
              </button>
              <p className="text-center text-xs text-mute">
                Just on your phone — the round keeps going for everyone else, and a bar at
                the bottom takes you straight back in.
              </p>
            </>
          )}

          {isHost && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => (confirming ? void endRound() : setConfirming(true))}
                className={`mt-2 w-full rounded-2xl border px-5 py-3.5 text-center text-sm font-bold transition active:scale-[0.98] disabled:opacity-40 ${
                  confirming ? "border-flame bg-flame/10 text-flame" : "border-line text-paper"
                }`}
              >
                {busy
                  ? "Ending…"
                  : confirming
                    ? "Tap again — this ends it for all six phones"
                    : "End this round for everyone"}
              </button>
              <p className="text-center text-xs text-mute">
                Points already awarded stay on the leaderboard.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl px-5 py-3 text-center text-sm font-bold text-mute transition active:scale-[0.98]"
          >
            Never mind, keep playing
          </button>
        </div>
      </div>
    </div>
  );
}

const RULES_SEEN_PREFIX = "commutation:rules-seen:";

/**
 * The rules affordance's content. Reachable any time via GameShell's "?" so
 * someone can re-check mid-round without asking the room, and shown once
 * automatically the first time a device ever hits that game — see
 * GameShell's rulesOpen state and the comment on why this renders as its
 * sibling, not its descendant.
 *
 * GETTING OUT OF IT has three independent routes on purpose, because this
 * thing covers the whole screen on a phone and one of them will be wrong
 * for somebody: the × in the top corner (a proper 44px target, always
 * visible, never scrolls away), the "Got it" button pinned to the bottom,
 * and tapping the dimmed area above the sheet. Escape closes it too, for
 * whoever's driving the TV from a laptop.
 *
 * The layout is a three-row flex column capped at 85dvh — header and footer
 * fixed, the rules themselves scrolling between them. Without that cap, a
 * four-line entry (Contact, Spyfall, 30 Seconds) grows the sheet past the
 * bottom of a small iPhone and pushes "Got it" off-screen, and a
 * `position: fixed` overlay has nothing to scroll, so the only way out
 * would be the backdrop nobody thinks to tap. dvh rather than vh because
 * Safari's toolbar makes vh lie about the visible height.
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      key={gameId}
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${title}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rise flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-line bg-ink-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber — the universal "this panel goes away" tell on a phone. */}
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-start gap-3 px-6 pt-3">
          <p className="flex flex-1 items-center gap-2 pt-1.5 text-sm font-black uppercase tracking-wider">
            <span className="text-lg">{icon}</span> {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl leading-none text-mute transition active:scale-90 active:bg-ink-3"
          >
            ✕
          </button>
        </div>

        <ul className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-3 text-sm leading-relaxed text-paper/90">
          {rules.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-mute">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-6 pt-4 pad-safe-b">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-flame px-5 py-4 text-center text-base font-black text-ink transition active:brightness-90"
          >
            Got it
          </button>
        </div>
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
