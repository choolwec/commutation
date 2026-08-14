"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule, GameViewProps } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { RoundTimer } from "@/components/play/RoundTimer";
import { useSeats, useTotalItems, pickN, shuffle } from "@/games/common";
import { STAGE_CHALLENGES } from "@/config/their-rounds";

/**
 * CENTRE STAGE — everyone performs in turn, everyone else rates it
 * (THEIR_ROUNDS §3.3).
 *
 * The one resolved question on this was whether ratings show per-rater or
 * only as an average, and the answer was per-rater, attributed. That's the
 * app's established register — nothing else here anonymises anything at the
 * reveal — and at six players "who gave me the 3" is more dramatic than a
 * mean. So ratings ride on `votes` (value = a numeric string, exactly what
 * 0005's comment on that column anticipated), sealed by show_votes until
 * the host opens them, then shown with names on.
 *
 * Reward commitment, not skill: that was explicit in the idea, so it's in
 * the rating scale's own labels rather than left to everyone's judgement —
 * the question on screen is how hard they went, not whether they can sing.
 *
 * You can't rate your own performance. Nothing stops the subject casting a
 * vote at the database level (cast_vote is deliberately open to any player
 * — see 0006), so the tally below filters the subject's own row out rather
 * than pretending the UI is the enforcement.
 *
 * VISUAL IDENTITY: a spotlight. Fuchsia gel, the performer's name lit in
 * the middle of a dark stage, and the ratings landing as a row of numbered
 * paddles like a judging panel.
 */

const ACCENT = "#d946ef";
const SECONDS = 60;
const POINTS_PER_STAR = 40;

const SCALE_LABEL: Record<number, string> = {
  1: "phoned it in",
  2: "barely tried",
  3: "fine",
  4: "committed",
  5: "no shame at all",
};

function Paddle({
  n,
  chosen,
  onPick,
}: {
  n: number;
  chosen: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 py-4 transition active:scale-95"
      style={{
        borderColor: chosen ? ACCENT : "var(--color-line)",
        background: chosen ? `color-mix(in oklab, ${ACCENT} 25%, transparent)` : "var(--color-ink-2)",
        boxShadow: chosen ? `0 0 20px color-mix(in oklab, ${ACCENT} 45%, transparent)` : undefined,
      }}
    >
      <span className="text-2xl font-black tabular-nums">{n}</span>
    </button>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, votes, isHost, call } = useRoom();
  const seats = useSeats();
  const total = useTotalItems();
  const card = useCurrentItems().find((i) => i.kind === "deck");
  const [busy, setBusy] = useState(false);

  const cursor = round?.item_cursor ?? 0;
  const performerId = typeof card?.meta?.performer === "string" ? card.meta.performer : null;
  const performer = seats.find((s) => s.id === performerId);

  const ratings = useMemo(
    () =>
      votes.filter(
        (v) => v.idx === cursor && v.player_id !== performerId && Number(v.value) > 0,
      ),
    [votes, cursor, performerId],
  );
  const totalStars = ratings.reduce((sum, v) => sum + Number(v.value), 0);
  const average = ratings.length ? totalStars / ratings.length : 0;

  if (!round || !card) {
    return (
      <GameShell icon="🎤" title="Centre Stage">
        <WaitingOnHost label="Warming up the room…" />
      </GameShell>
    );
  }

  const isLast = cursor >= total - 1;
  const revealed = round.show_votes || round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";
  const iAmPerformer = Boolean(me && performerId === me.id);
  const myRating = votes.find((v) => v.idx === cursor && v.player_id === me?.id);

  async function rate(n: number) {
    if (!round || busy) return;
    setBusy(true);
    try {
      await call("cast_vote", { p_round: round.id, p_idx: cursor, p_value: String(n) });
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (!round) return;
    await call("set_reveal", { p_round: round.id, p_submissions: false, p_votes: true });
  }

  async function next() {
    if (!round || !performerId || busy) return;
    setBusy(true);
    try {
      if (totalStars > 0) {
        await call("award_points", {
          p_player: performerId,
          p_points: totalStars * POINTS_PER_STAR,
          p_reason: "centre_stage",
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
      icon="🎤"
      title="Centre Stage"
      subtitle={`Act ${cursor + 1} of ${total}`}
      dock={
        isHost && !isDone ? (
          <div className="pt-3">
            <PrimaryButton
              onClick={() => void (revealed ? next() : reveal())}
              disabled={busy}
              style={{ background: ACCENT, color: "white" }}
            >
              {revealed
                ? isLast
                  ? `Bank ${totalStars * POINTS_PER_STAR} and finish`
                  : `Bank ${totalStars * POINTS_PER_STAR} — next act →`
                : "Show the scores"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 15%, ${ACCENT}, transparent 70%)`,
          opacity: 0.2,
        }}
      />

      <div className="rise text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-mute">
          On stage
        </p>
        <p className="mt-1 text-3xl font-black tracking-tight">
          {performer?.emoji} {performer?.name ?? "—"}
        </p>
      </div>

      <div
        className="rise mt-5 rounded-3xl border-2 p-6 text-center"
        style={{
          borderColor: ACCENT,
          background: `color-mix(in oklab, ${ACCENT} 12%, var(--color-ink-2))`,
        }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
          {typeof card.meta?.name === "string" ? card.meta.name : "The Act"}
        </p>
        <p className="mt-3 text-lg font-bold leading-snug">{card.content}</p>
      </div>

      {!revealed && (
        <div className="mt-5 text-center">
          <RoundTimer seconds={SECONDS} className="text-4xl leading-none" />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
            on the clock
          </p>
        </div>
      )}

      {!revealed && !iAmPerformer && (
        <div className="rise mt-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
            How hard did they go?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Paddle
                key={n}
                n={n}
                chosen={myRating?.value === String(n)}
                onPick={() => void rate(n)}
              />
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-mute">
            {myRating
              ? `${myRating.value} — "${SCALE_LABEL[Number(myRating.value)]}". Change it until the host opens the scores.`
              : "Rate commitment, not talent. Nobody here can sing."}
          </p>
        </div>
      )}

      {!revealed && iAmPerformer && (
        <p className="rise mt-6 text-center text-sm text-mute">
          Go. Everyone else is holding a number and they are not being kind.
        </p>
      )}

      {revealed && (
        <div className="rise mt-6 space-y-4">
          <div className="text-center">
            <p className="text-6xl font-black leading-none tabular-nums" style={{ color: ACCENT }}>
              {average.toFixed(1)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
              average · {totalStars * POINTS_PER_STAR} points
            </p>
          </div>
          <div className="space-y-2">
            {ratings
              .slice()
              .sort((a, b) => Number(b.value) - Number(a.value))
              .map((v) => {
                const seat = seats.find((s) => s.id === v.player_id);
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-2.5"
                  >
                    <span className="text-lg">{seat?.emoji ?? "👤"}</span>
                    <span className="flex-1 text-sm font-semibold">{seat?.name}</span>
                    <span className="text-xs text-mute">
                      {SCALE_LABEL[Number(v.value)] ?? ""}
                    </span>
                    <span
                      className="w-6 text-right text-lg font-black tabular-nums"
                      style={{ color: ACCENT }}
                    >
                      {v.value}
                    </span>
                  </div>
                );
              })}
            {ratings.length === 0 && (
              <p className="text-center text-xs text-mute">Nobody rated it. Brutal.</p>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/**
 * TV: mirrors the phone's own spotlight — timer, performer, the act's brief
 * — so the room has something bigger than a phone to actually watch while
 * someone performs, per the brief "don't remove what's on the phones, just
 * add the same thing to the TV." Phones stay exactly as they were: this is
 * a pure addition, ratings still happen there.
 */
function Tv({ round }: GameViewProps) {
  const seats = useSeats();
  const { votes } = useRoom();
  const card = useCurrentItems().find((i) => i.kind === "deck");
  const cursor = round.item_cursor;
  const performerId = typeof card?.meta?.performer === "string" ? card.meta.performer : null;
  const performer = seats.find((s) => s.id === performerId);

  const ratings = useMemo(
    () => votes.filter((v) => v.idx === cursor && v.player_id !== performerId && Number(v.value) > 0),
    [votes, cursor, performerId],
  );
  const totalStars = ratings.reduce((sum, v) => sum + Number(v.value), 0);
  const average = ratings.length ? totalStars / ratings.length : 0;
  const revealed = round.show_votes || round.phase === "reveal" || round.phase === "done";

  if (!card) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-2xl font-bold text-mute">Warming up the room…</p>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 10%, color-mix(in oklab, ${ACCENT} 35%, transparent), transparent 70%)`,
        }}
      />

      <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <p className="rise text-sm font-black uppercase tracking-[0.35em] text-mute">
          On stage
        </p>
        <p className="rise text-6xl font-black tracking-tight">
          {performer?.emoji} {performer?.name ?? "—"}
        </p>

        <div
          className="rise rounded-3xl border-2 px-10 py-7"
          style={{ borderColor: ACCENT, background: `color-mix(in oklab, ${ACCENT} 14%, var(--color-ink-2))` }}
        >
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
            {typeof card.meta?.name === "string" ? card.meta.name : "The Act"}
          </p>
          <p className="mt-3 text-3xl font-bold leading-snug">{card.content}</p>
        </div>

        {!revealed ? (
          <>
            <RoundTimer seconds={SECONDS} className="text-7xl leading-none" />
            <p className="text-xs font-bold uppercase tracking-wider text-mute">on the clock</p>
          </>
        ) : (
          <div className="rise flex flex-col items-center gap-4">
            <p className="text-8xl font-black leading-none tabular-nums" style={{ color: ACCENT }}>
              {average.toFixed(1)}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {ratings
                .slice()
                .sort((a, b) => Number(b.value) - Number(a.value))
                .map((v) => {
                  const seat = seats.find((s) => s.id === v.player_id);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-2xl border border-line bg-ink-2 px-4 py-2"
                    >
                      <span className="text-xl">{seat?.emoji ?? "👤"}</span>
                      <span className="text-lg font-black tabular-nums" style={{ color: ACCENT }}>
                        {v.value}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export const centreStage: GameModule = {
  id: "centre_stage",
  title: "Centre Stage",
  hall: "huddle",
  icon: "🎤",
  blurb: "Everyone performs, everyone rates. Commitment scores, talent doesn't.",
  source: { kind: "deck" },
  origin: "group",
  minutes: 15,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 2) throw new Error("need at least two people holding a profile");

    // Everyone goes exactly once, in a shuffled running order — the point of
    // the round is that nobody gets to sit it out.
    const order = shuffle(playing);
    const acts = pickN(STAGE_CHALLENGES, order.length);

    const roundId = (await call("start_deck_round", {
      p_game: "centre_stage",
      p_hall: "huddle",
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: order.map((p, i) => ({
        content: acts[i % acts.length].brief,
        meta: { performer: p.id, name: acts[i % acts.length].name },
      })),
    });

    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
  TvView: Tv,
};
