"use client";

import { useState } from "react";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, GhostButton, PrimaryButton } from "@/components/play/GameShell";
import { RoundTimer } from "@/components/play/RoundTimer";
import { KnockOutList, useSeats, useTotalItems, finishPoints, pickN } from "@/games/common";
import { SPEED_CARD_TWISTS } from "@/config/their-rounds";

/**
 * SPEED CARDS — a real deck, played fast (THEIR_ROUNDS §3.1).
 *
 * The resolution on this one was that a physical deck would be in the house
 * and the app should not try to be the cards. Real-time simultaneous card
 * play doesn't fit deal → submit → vote → reveal and forcing it in would
 * produce a worse version of a game the room can already play perfectly.
 *
 * So this is deliberately the thinnest module in the app: a shared clock, a
 * house twist per hand so six hands don't flatten into one, and a
 * finishing-order tap feeding award_points(). The cards are cards.
 *
 * Note the direction of the ladder — in a shedding game, going out FIRST is
 * winning, which is the opposite of Clap Circle's elimination order. Both
 * use finishPoints() with an explicit flag rather than two lookalike
 * expressions, because getting that backwards would silently invert a whole
 * round's leaderboard.
 *
 * VISUAL IDENTITY: a card table. Felt green, and the twist dealt as an
 * actual card sitting at a slight angle on the baize.
 */

const ACCENT = "#059669";
const HANDS = 5;
const HAND_SECONDS = 240;

function Phone() {
  const { round, isHost, call } = useRoom();
  const seats = useSeats();
  const total = useTotalItems();
  const twist = useCurrentItems().find((i) => i.kind === "deck");
  const [out, setOut] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [timing, setTiming] = useState(false);

  if (!round) return null;

  const cursor = round.item_cursor;
  const isLast = cursor >= total - 1;
  const isDone = round.phase === "done";

  async function knockOut(id: string) {
    if (!round || busy || out.includes(id)) return;
    setBusy(true);
    try {
      await call("award_points", {
        p_player: id,
        p_points: finishPoints(out.length, seats.length, true),
        p_reason: "speed_cards",
        p_round: round.id,
      });
      setOut((o) => [...o, id]);
    } finally {
      setBusy(false);
    }
  }

  async function nextHand() {
    if (!round || busy) return;
    setBusy(true);
    try {
      setOut([]);
      setTiming(false);
      if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
      else await call("set_cursor", { p_round: round.id, p_cursor: cursor + 1 });
    } finally {
      setBusy(false);
    }
  }

  async function startClock() {
    if (!round || busy) return;
    setBusy(true);
    try {
      // Restamps started_at without moving the hand on.
      await call("set_phase", { p_round: round.id, p_phase: "play" });
      setTiming(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell
      icon="🃏"
      title="Speed Cards"
      subtitle={isDone ? "Finished" : `Hand ${cursor + 1} of ${total}`}
      dock={
        isHost && !isDone ? (
          <div className="space-y-2 pt-3">
            {!timing && (
              <GhostButton onClick={() => void startClock()} disabled={busy}>
                Start the clock on this hand
              </GhostButton>
            )}
            <PrimaryButton
              onClick={() => void nextHand()}
              disabled={busy}
              style={{ background: ACCENT, color: "white" }}
            >
              {isLast ? "Finish round" : "Next hand →"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${ACCENT}, transparent 65%)`,
          opacity: 0.14,
        }}
      />

      <div
        className="rise mx-auto max-w-[300px] rounded-2xl border-2 px-6 py-8 text-center"
        style={{
          borderColor: ACCENT,
          background: `linear-gradient(150deg, color-mix(in oklab, ${ACCENT} 22%, var(--color-ink-2)), var(--color-ink-2))`,
          transform: "rotate(-2deg)",
          boxShadow: `0 12px 0 -6px color-mix(in oklab, ${ACCENT} 40%, transparent)`,
        }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
          House twist
        </p>
        <p className="mt-3 text-lg font-black leading-snug">
          {twist?.content ?? "Play it straight."}
        </p>
      </div>

      {timing && (
        <div className="rise mt-6 text-center">
          <RoundTimer seconds={HAND_SECONDS} className="text-5xl leading-none" />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
            on the clock
          </p>
        </div>
      )}

      {isHost && !isDone ? (
        <div className="rise mt-6">
          <KnockOutList
            seats={seats}
            out={out}
            accent={ACCENT}
            prompt="Tap each person the moment they go out"
            firstBest
            onOut={(id) => void knockOut(id)}
          />
        </div>
      ) : (
        <div className="rise mt-6 rounded-3xl border border-dashed border-line p-6 text-center">
          <p className="text-sm leading-relaxed text-mute">
            Real cards, real table. Shed your hand first and you take the most points — the
            host is tapping people in as they go out.
          </p>
        </div>
      )}

      {!isHost && out.length === 0 && (
        <p className="mt-4 text-center text-xs text-mute">
          Points land on the leaderboard as each person goes out.
        </p>
      )}
    </GameShell>
  );
}

export const speedCards: GameModule = {
  id: "speed_cards",
  title: "Speed Cards",
  hall: "huddle",
  icon: "🃏",
  blurb: "Real deck, real table. The app just runs the clock and the ledger.",
  source: { kind: "deck" },
  origin: "group",
  minutes: 20,
  async start({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "speed_cards",
      p_hall: "huddle",
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: pickN(SPEED_CARD_TWISTS, HANDS).map((content) => ({ content })),
    });

    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
