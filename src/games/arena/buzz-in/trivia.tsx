"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { ContentCard } from "@/components/play/GameShell";
import { TRIVIA } from "@/config/decks";
import {
  BuzzButton,
  BuzzHost,
  useBuzzState,
  useCurrentItems,
  useTotalItems,
  WaitingOnHost,
} from "./shared";

/**
 * BUZZ IN: TRIVIA — cyan, quiz-show, a real physical buzzer.
 *
 * Known, accepted trade-off (same one Fibbage/decks.ts already carries):
 * the answer key ships in the JS bundle like the rest of the static content
 * decks, so a determined cheater could read it in devtools. Same honor-system
 * trust as a board game's answer booklet sitting in the box — not worth a
 * server round-trip to fix for six people who know each other.
 */

const GLOW = "#22d3ee"; // --color-cyan

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Phone() {
  const { roster } = usePlayer();
  const { round, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const total = useTotalItems();
  const { winner, locked, iAmWinner, buzz, buzzing } = useBuzzState();
  const [ruled, setRuled] = useState(false);

  const q = item ? (JSON.parse(item.content) as { q: string; options: string[]; answer: number }) : null;
  const winnerName = roster.find((p) => p.id === winner?.player_id)?.name;

  async function rule(correct: boolean) {
    if (!round || !winner) return;
    setRuled(true);
    await call("award_points", {
      p_player: winner.player_id,
      p_points: correct ? 150 : -25,
      p_reason: "buzz_in_trivia",
      p_round: round.id,
    });
  }

  async function next() {
    if (!round) return;
    setRuled(false);
    await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
  }
  async function finish() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  if (!round || !q) {
    return <WaitingOnHost label="Loading questions…" />;
  }

  return (
    <BuzzHost
      title="Buzz In · Trivia"
      cursor={round.item_cursor}
      total={total}
      glow={GLOW}
      onNext={next}
      onFinish={finish}
    >
      <ContentCard>{q.q}</ContentCard>

      <div className="mt-8 flex flex-col items-center gap-6">
        {!locked ? (
          <BuzzButton locked={locked} iAmWinner={iAmWinner} onBuzz={() => void buzz()} glow={GLOW} />
        ) : (
          <div className="rise text-center">
            <p className="text-2xl font-black" style={{ color: GLOW }}>
              {winnerName ?? "Someone"} buzzed first!
            </p>
            {iAmWinner && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {q.options.map((o, i) => (
                  <div
                    key={o}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${
                      i === q.answer ? "border-emerald-400/60" : "border-line"
                    }`}
                  >
                    {o}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {buzzing && <p className="text-xs text-mute">buzzing…</p>}
      </div>

      {isHost && locked && !ruled && (
        <div className="rise mt-6 space-y-2">
          <p className="text-center text-sm text-mute">
            Correct answer: <span className="font-bold text-paper">{q.options[q.answer]}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void rule(true)}
              className="flex-1 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 py-3 text-sm font-bold text-emerald-300 active:scale-95"
            >
              ✓ Correct (+150)
            </button>
            <button
              type="button"
              onClick={() => void rule(false)}
              className="flex-1 rounded-2xl border border-flame/50 bg-flame/10 py-3 text-sm font-bold text-flame active:scale-95"
            >
              ✗ Wrong (−25)
            </button>
          </div>
        </div>
      )}
    </BuzzHost>
  );
}

export const buzzInTrivia: GameModule = {
  id: "buzz_in_trivia",
  title: "Buzz In: Trivia",
  hall: "arena",
  icon: "🎙️",
  blurb: "First to slam the buzzer gets the question. Miss it, lose points.",
  source: { kind: "deck" },
  requiresTv: true,
  minutes: 10,
  async start({ call }) {
    const roundId = await call("start_deck_round", {
      p_game: "buzz_in_trivia",
      p_hall: "arena",
    });
    const picked = shuffle(TRIVIA).slice(0, 8);
    await call("deal_deck", {
      p_round: roundId,
      p_items: picked.map((q) => ({ content: JSON.stringify(q) })),
    });
  },
  PhoneView: Phone,
};
