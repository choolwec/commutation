"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule, GameViewProps } from "@/lib/game/types";
import { ContentCard } from "@/components/play/GameShell";
import { Leaderboard } from "@/components/play/Leaderboard";
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
 *
 * TV BOARD: the correct answer must never render on the TV before the host
 * actually rules on it — the generic fallback board used to dump the whole
 * round_item, JSON blob and all, straight onto the screen, which meant the
 * answer index was sitting in plain text the instant a question was dealt.
 * The fix isn't just "don't do that" — the TV genuinely doesn't know when
 * the host has ruled, since that decision lived only in the host's own
 * local `ruled` state. So `rule()` below also posts a `round_events` row
 * (kind: "ruled") — the same public, timestamped, self-inserted primitive
 * Buzz In already uses for "who buzzed" — and the TV gates the reveal on
 * that event existing for the current question, not on anything client-side.
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

  let q: { q: string; options: string[]; answer: number } | null = null;
  if (item) {
    try {
      q = JSON.parse(item.content) as { q: string; options: string[]; answer: number };
    } catch {
      // A round transition can briefly hand this component a stale item
      // before the next fetch lands — same defensive pattern hot-takes and
      // the other JSON-content games already use. Treat it as "not dealt
      // yet" rather than crashing the round.
    }
  }
  const winnerName = roster.find((p) => p.id === winner?.player_id)?.name;

  async function rule(correct: boolean) {
    if (!round || !winner) return;
    setRuled(true);
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("round_events").insert({
        round_id: round.id,
        idx: round.item_cursor,
        player_id: winner.player_id,
        kind: "ruled",
        value: correct ? "correct" : "wrong",
      });
    }
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

function Tv({ round }: GameViewProps) {
  const { roster } = usePlayer();
  const { events, items } = useRoom();
  const cursor = round.item_cursor;
  const item = items.find((i) => i.idx === cursor);

  let q: { q: string; options: string[]; answer: number } | null = null;
  if (item) {
    try {
      q = JSON.parse(item.content) as { q: string; options: string[]; answer: number };
    } catch {
      // Same defensive parse as the phone view — see its own comment.
    }
  }

  const here = events.filter((e) => e.idx === cursor);
  const buzz = here.find((e) => e.kind === "buzz") ?? null;
  const ruling = here.find((e) => e.kind === "ruled") ?? null;
  const winnerName = roster.find((p) => p.id === buzz?.player_id)?.name;
  const revealed = Boolean(ruling);

  if (!q) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-2xl font-bold text-mute">Dealing questions…</p>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-dvh grid-cols-[1fr_360px] gap-8 overflow-hidden p-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in oklab, ${GLOW} 25%, transparent), transparent 65%)` }}
      />
      <section className="flex flex-col items-center justify-center gap-8 text-center">
        <p className="text-xl font-black uppercase tracking-[0.3em]" style={{ color: GLOW }}>
          🎙️ Buzz In · Trivia
        </p>
        <p className="rise max-w-4xl text-5xl font-black leading-tight">{q.q}</p>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
          {q.options.map((o, i) => {
            const isCorrect = revealed && i === q.answer;
            return (
              <div
                key={o}
                className={`rounded-2xl border-2 px-5 py-5 text-xl font-bold transition-all duration-500 ${
                  isCorrect
                    ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                    : "border-line bg-ink-2 text-paper"
                }`}
              >
                {o} {isCorrect && "✓"}
              </div>
            );
          })}
        </div>

        {buzz && !ruling && (
          <div
            className="rise flex items-center gap-3 rounded-full border-2 px-8 py-4"
            style={{
              borderColor: GLOW,
              background: `color-mix(in oklab, ${GLOW} 18%, transparent)`,
              boxShadow: `0 0 48px color-mix(in oklab, ${GLOW} 45%, transparent)`,
            }}
          >
            <span className="text-2xl font-black" style={{ color: GLOW }}>
              {winnerName ?? "Someone"} buzzed first!
            </span>
          </div>
        )}
        {ruling && (
          <p
            className={`rise text-2xl font-black ${
              ruling.value === "correct" ? "text-emerald-300" : "text-flame"
            }`}
          >
            {winnerName} was {ruling.value === "correct" ? "right — +150" : "wrong — −25"}
          </p>
        )}
        {!buzz && <p className="text-lg text-mute">Buzzers are live…</p>}
      </section>

      <aside className="flex flex-col justify-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-mute">
          Leaderboard
        </p>
        <Leaderboard />
      </aside>
    </main>
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
  TvView: Tv,
};
