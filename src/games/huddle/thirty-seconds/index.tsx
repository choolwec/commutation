"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { RoundTimer } from "@/components/play/RoundTimer";
import { useSeats, useTotalItems, pickN } from "@/games/common";
import { THIRTY_SECOND_CARDS } from "@/config/their-rounds";

/**
 * 30 SECONDS — five words, half a minute, and you may not say the words
 * (THEIR_ROUNDS §2.5, confirmed as the real named party game).
 *
 * The card goes to the describer alone via deal_private — deal_deck would
 * put it on the guessers' screens too, which is the whole game gone. The
 * guessers shout; only the describer's phone has anything to tap.
 *
 * Two things worth knowing about how the clock works here:
 *
 *  · It starts when the DESCRIBER taps GO, not when the host deals the
 *    card — you need a second to read five words before anyone's counting.
 *    That moment is a round_events row (public, self-inserted, migration
 *    0008 — the same primitive Buzz In uses for who-buzzed-first), and
 *    RoundTimer counts down from its server timestamp, so all six phones
 *    still agree to the millisecond.
 *
 *  · Every "got it" is also a round_events row, which means the counter
 *    ticks up live on every phone in the room, not just the describer's.
 *    Watching a stranger's count go 3… 4… with eight seconds left is the
 *    best part of this game and it costs one insert.
 *
 * VISUAL IDENTITY: a stopwatch. Teal, tabular numerals big enough to read
 * from across a room, and the whole screen going flame-red under ten
 * seconds.
 */

const ACCENT = "#14b8a6";
const CARDS = 4;
const SECONDS = 30;
const PER_WORD = 100;

function useCardWords(content: string | undefined): string[] {
  return useMemo(() => {
    if (!content) return [];
    try {
      const parsed = JSON.parse(content) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [content]);
}

/** The describer's list. Tapping a word posts it publicly as landed. */
function WordList({
  words,
  got,
  onGot,
  live,
}: {
  words: string[];
  got: Set<string>;
  onGot: (w: string) => void;
  live: boolean;
}) {
  return (
    <div className="mt-5 space-y-2">
      {words.map((w) => {
        const done = got.has(w);
        return (
          <button
            key={w}
            type="button"
            disabled={done || !live}
            onClick={() => onGot(w)}
            className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:active:scale-100"
            style={{
              borderColor: done ? ACCENT : "var(--color-line)",
              background: done
                ? `color-mix(in oklab, ${ACCENT} 18%, transparent)`
                : "var(--color-ink-2)",
              opacity: !live && !done ? 0.45 : 1,
            }}
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-black"
              style={{
                borderColor: done ? ACCENT : "var(--color-line)",
                background: done ? ACCENT : "transparent",
                color: done ? "var(--color-ink)" : "var(--color-mute)",
              }}
            >
              {done ? "✓" : ""}
            </span>
            <span
              className={`flex-1 text-base font-bold ${done ? "text-mute line-through" : ""}`}
            >
              {w}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, events, isHost, call } = useRoom();
  const seats = useSeats();
  const total = useTotalItems();
  const here = useCurrentItems();
  const [busy, setBusy] = useState(false);

  const marker = here.find((i) => i.kind === "deck");
  const card = here.find((i) => i.kind === "private");
  const words = useCardWords(card?.content);

  const cursor = round?.item_cursor ?? 0;
  const goEvent = events.find((e) => e.idx === cursor && e.kind === "go") ?? null;
  const gotHere = useMemo(
    () => events.filter((e) => e.idx === cursor && e.kind === "got"),
    [events, cursor],
  );
  const got = useMemo(
    () => new Set(gotHere.map((e) => e.value ?? "")),
    [gotHere],
  );

  if (!round || !marker) {
    return (
      <GameShell icon="⏱️" title="30 Seconds">
        <WaitingOnHost label="Shuffling the cards…" />
      </GameShell>
    );
  }

  const isLast = cursor >= total - 1;
  const isDone = round.phase === "done";
  const describerId =
    typeof marker.meta?.describer === "string" ? marker.meta.describer : null;
  const describer = seats.find((s) => s.id === describerId);
  const iAmDescriber = Boolean(me && describerId === me.id);
  const running = Boolean(goEvent);

  async function post(kind: string, value?: string) {
    const supabase = getSupabase();
    if (!supabase || !round || !me) return;
    await supabase
      .from("round_events")
      .insert({ round_id: round.id, idx: cursor, player_id: me.id, kind, value: value ?? null });
  }

  async function bank() {
    if (!round || !describerId || busy) return;
    setBusy(true);
    try {
      if (got.size > 0) {
        await call("award_points", {
          p_player: describerId,
          p_points: got.size * PER_WORD,
          p_reason: "thirty_seconds",
          p_round: round.id,
        });
      }
      if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
      else await call("set_cursor", { p_round: round.id, p_cursor: cursor + 1 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell
      icon="⏱️"
      title="30 Seconds"
      subtitle={`Card ${cursor + 1} of ${total}`}
      dock={
        isHost && !isDone ? (
          <div className="pt-3">
            <PrimaryButton
              onClick={() => void bank()}
              disabled={busy}
              style={{ background: ACCENT, color: "var(--color-ink)" }}
            >
              {busy
                ? "Banking…"
                : `Bank ${got.size * PER_WORD} for ${describer?.name ?? "them"} ${
                    isLast ? "and finish" : "→"
                  }`}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div className="rise text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-mute">Describing</p>
        <p className="mt-1 text-2xl font-black tracking-tight">
          {describer?.emoji} {describer?.name ?? "—"}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
        {running ? (
          <RoundTimer
            seconds={SECONDS}
            from={goEvent?.created_at}
            className="text-6xl leading-none"
          />
        ) : (
          <p className="text-6xl font-black leading-none tabular-nums text-mute">{SECONDS}s</p>
        )}
        <div className="text-center">
          <p
            className="text-6xl font-black leading-none tabular-nums"
            style={{ color: ACCENT }}
          >
            {got.size}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">of 5</p>
        </div>
      </div>

      {iAmDescriber ? (
        <>
          {!running && (
            <div className="mt-6">
              <PrimaryButton
                onClick={() => void post("go")}
                style={{ background: ACCENT, color: "var(--color-ink)" }}
              >
                Read them, then tap GO
              </PrimaryButton>
              <p className="mt-2 text-center text-xs text-mute">
                Nothing starts until you do. Take your second.
              </p>
            </div>
          )}
          {running && (
            <WordList
              words={words}
              got={got}
              live
              onGot={(w) => void post("got", w)}
            />
          )}
          {!running && words.length > 0 && (
            <WordList words={words} got={got} live={false} onGot={() => {}} />
          )}
          <p className="mt-4 text-center text-xs text-mute">
            You may not say the word, any part of it, or &quot;rhymes with&quot;. Tap each one
            the room lands.
          </p>
        </>
      ) : (
        <div className="rise mt-6 space-y-3">
          <div className="rounded-3xl border border-dashed border-line p-6 text-center">
            <p className="text-sm leading-relaxed text-mute">
              {running ? (
                <>Shout everything. Wrong answers cost nothing — silence costs everything.</>
              ) : (
                <>
                  {describer?.name ?? "They"} are reading their card. The clock starts the
                  second they tap go.
                </>
              )}
            </p>
          </div>
          {gotHere.length > 0 && (
            <div className="space-y-1.5">
              {gotHere.map((e) => (
                <p
                  key={e.id}
                  className="rounded-xl border px-4 py-2 text-sm font-bold"
                  style={{
                    borderColor: ACCENT,
                    background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                  }}
                >
                  ✓ {e.value}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

export const thirtySeconds: GameModule = {
  id: "thirty_seconds",
  title: "30 Seconds",
  hall: "huddle",
  icon: "⏱️",
  blurb: "Five words, half a minute, and you can't say any of them.",
  source: { kind: "private" },
  origin: "group",
  minutes: 10,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 2) throw new Error("need at least two people holding a profile");

    const cards = pickN(THIRTY_SECOND_CARDS, CARDS);
    const start = Math.floor(Math.random() * playing.length);

    const roundId = (await call("start_deck_round", {
      p_game: "thirty_seconds",
      p_hall: "huddle",
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: cards.map((_, i) => ({
        content: "Card up",
        meta: { describer: playing[(start + i) % playing.length].id },
      })),
    });

    for (let i = 0; i < cards.length; i++) {
      await call("deal_private", {
        p_round: roundId,
        p_idx: i,
        p_to: playing[(start + i) % playing.length].id,
        p_content: JSON.stringify(cards[i]),
      });
    }

    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
