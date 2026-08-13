"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton } from "@/components/play/GameShell";
import { RoundTimer } from "@/components/play/RoundTimer";
import { SeatRing, useSeats, pickN } from "@/games/common";
import { VOLLEY_OPENERS } from "@/config/their-rounds";

/**
 * QUESTION VOLLEY — you're asked a question, and you must immediately ask
 * the NEXT person a question instead of answering it. Hesitate and you have
 * to answer the one you were asked (THEIR_ROUNDS §3.4).
 *
 * The cheapest idea on the whole list to support and one of the best-suited
 * to six people sat down, so it's built exactly as specified and no further:
 * a turn pointer, the three-second hesitation clock the host arms per turn,
 * and a log of who ended up answering.
 *
 * Two decisions worth knowing:
 *
 *  · The clock is item_cursor, not new state. set_cursor (0006) stamps
 *    rounds.started_at, so "pass it on" restarts a three-second countdown on
 *    all six phones at once, from one server timestamp, for free. The turn
 *    pointer is that same cursor modulo the seats.
 *
 *  · Getting caught is SELF-reported. round_events only lets you insert your
 *    own row (0008's RLS), and that turns out to be the right shape rather
 *    than a limitation — the person who hesitated is the one person in the
 *    room who definitely knows they hesitated, and owning it out loud is
 *    the forfeit. The forfeit here is sincerity, not performance.
 *
 * VISUAL IDENTITY: a rally. Sky blue, the ring from Clap Circle reused so
 * the two circle games feel like siblings, and a three-second bar that
 * drains fast enough to actually create pressure.
 */

const ACCENT = "#0ea5e9";
const HESITATION = 3;
const SURVIVOR_POINTS = 100;

function Phone() {
  const { me } = usePlayer();
  const { round, items, events, isHost, call } = useRoom();
  const seats = useSeats();
  const [busy, setBusy] = useState(false);

  // Read at idx 0 directly rather than through useCurrentItems: the cursor
  // is the turn counter here, so it walks past every item index there is.
  const opener = items.find((i) => i.idx === 0);
  const cursor = round?.item_cursor ?? 0;
  const offset = typeof round?.config?.offset === "number" ? round.config.offset : 0;
  const n = Math.max(seats.length, 1);
  const active = seats[(offset + cursor) % n];
  const onDeck = seats[(offset + cursor + 1) % n];
  const isDone = round?.phase === "done";
  const iAmUp = Boolean(me && active?.id === me.id);

  const caught = useMemo(
    () => events.filter((e) => e.kind === "caught"),
    [events],
  );
  const caughtIds = useMemo(() => new Set(caught.map((e) => e.player_id)), [caught]);
  const iAmCaughtHere = caught.some((e) => e.player_id === me?.id && e.idx === cursor);

  async function pass() {
    if (!round || busy) return;
    setBusy(true);
    try {
      await call("set_cursor", { p_round: round.id, p_cursor: cursor + 1 });
    } finally {
      setBusy(false);
    }
  }

  async function ownIt() {
    const supabase = getSupabase();
    if (!supabase || !round || !me || iAmCaughtHere) return;
    await supabase.from("round_events").insert({
      round_id: round.id,
      idx: cursor,
      player_id: me.id,
      kind: "caught",
    });
  }

  async function finish() {
    if (!round || busy) return;
    setBusy(true);
    try {
      for (const s of seats) {
        if (caughtIds.has(s.id)) continue;
        await call("award_points", {
          p_player: s.id,
          p_points: SURVIVOR_POINTS,
          p_reason: "volley_survivor",
          p_round: round.id,
        });
      }
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell
      icon="🏓"
      title="Question Volley"
      subtitle={isDone ? "Finished" : `Volley ${cursor + 1}`}
      dock={
        isHost && !isDone ? (
          <div className="space-y-2 pt-3">
            <PrimaryButton
              onClick={() => void pass()}
              disabled={busy}
              style={{ background: ACCENT, color: "var(--color-ink)" }}
            >
              They got it out — {onDeck?.name ?? "next"}&apos;s turn →
            </PrimaryButton>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={busy}
              className="w-full rounded-2xl border border-line px-5 py-2.5 text-center text-xs font-bold text-mute active:scale-[0.98] disabled:opacity-40"
            >
              End the round and pay everyone who never cracked
            </button>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${ACCENT}, transparent 55%)`,
          opacity: 0.12,
        }}
      />

      <SeatRing
        seats={seats}
        activeId={active?.id}
        outIds={[...caughtIds]}
        accent={ACCENT}
      >
        <div className="text-center">
          {!isDone ? (
            <>
              <RoundTimer seconds={HESITATION} className="text-5xl leading-none" />
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
                to fire back
              </p>
            </>
          ) : (
            <p className="text-2xl">🏓</p>
          )}
          <p className="mt-2 max-w-[120px] truncate text-sm font-black">
            {active?.name ?? "—"}
          </p>
        </div>
      </SeatRing>

      {cursor === 0 && opener && (
        <div
          className="rise mt-2 rounded-3xl border-2 p-5 text-center"
          style={{
            borderColor: ACCENT,
            background: `color-mix(in oklab, ${ACCENT} 12%, var(--color-ink-2))`,
          }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-mute">
            Opening serve
          </p>
          <p className="mt-2 text-lg font-bold leading-snug">{opener.content}</p>
        </div>
      )}

      {!isDone && (
        <p className="rise mt-4 text-center text-xs leading-relaxed text-mute">
          Don&apos;t answer it. Turn to{" "}
          <span className="font-black text-paper">{onDeck?.name ?? "the next person"}</span> and
          ask them something instead — you&apos;ve got three seconds. Everything after the
          opener comes out of your own head.
        </p>
      )}

      {iAmUp && !isDone && (
        <button
          type="button"
          onClick={() => void ownIt()}
          disabled={iAmCaughtHere}
          className="rise mt-5 w-full rounded-2xl border-2 border-dashed px-5 py-4 text-sm font-black transition active:scale-[0.98] disabled:opacity-50"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          {iAmCaughtHere ? "Owned it — now answer it properly" : "I froze. I'll answer it."}
        </button>
      )}

      {caught.length > 0 && (
        <div className="rise mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">
            Cracked, and had to actually answer
          </p>
          <div className="flex flex-wrap gap-2">
            {[...caughtIds].map((id) => {
              const seat = seats.find((s) => s.id === id);
              if (!seat) return null;
              const times = caught.filter((e) => e.player_id === id).length;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs font-bold"
                >
                  {seat.emoji} {seat.name}
                  {times > 1 && <span className="text-mute">×{times}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {isDone && (
        <p className="rise mt-6 text-center text-sm text-mute">
          Anyone who never cracked took {SURVIVOR_POINTS}. Everything anybody admitted is in
          the ledger for the end-of-day awards.
        </p>
      )}
    </GameShell>
  );
}

export const questionVolley: GameModule = {
  id: "question_volley",
  title: "Question Volley",
  hall: "huddle",
  icon: "🏓",
  blurb: "Never answer — ask the next person instead. Freeze and you're caught.",
  source: { kind: "deck" },
  origin: "group",
  minutes: 8,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 3) throw new Error("this one needs at least three people");

    const roundId = (await call("start_deck_round", {
      p_game: "question_volley",
      p_hall: "huddle",
      p_config: { offset: Math.floor(Math.random() * playing.length) },
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: pickN(VOLLEY_OPENERS, 1).map((content) => ({ content })),
    });

    // Nothing else sets started_at on a fresh round, and the whole game is
    // a three-second countdown from it — same one-liner The Chameleon needed.
    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
