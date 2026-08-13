"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { useSeats, useTotalItems, pickN } from "@/games/common";
import { OPPOSITES } from "@/config/their-rounds";

/**
 * ACT IT OUT — charades with the group's own twist (THEIR_ROUNDS §1.1).
 *
 * The submitted idea was "acting, but you perform the OPPOSITE of your
 * card and everyone guesses the original." Rather than ship that as a
 * separate game, it's the flip that makes this one worth playing: roughly
 * two cards in five come up OPPOSITE DAY, announced to the room but not to
 * the guess — so the room has to hold the inversion in their heads while
 * they watch. Straight cards are the control group that makes it land.
 *
 * Either way the answer is the same thing — the word ON the card — so one
 * deck, one scorer, and no "wait, which way round is this one" at the
 * reveal. Guesses are typed rather than shouted so score_exact (0015) can
 * settle it: everyone who typed it scores, nobody adjudicates out loud, and
 * the accept-lists in OPPOSITES mean "worn out" doesn't lose to "exhausted".
 *
 * Why the performer can't just be picked on the host's phone: they can. The
 * card is dealt with deal_private_answers (0015), which is host-called —
 * the host's device knows every word in the deck anyway, same accepted
 * trust level as Fibbage's answer key (HANDOFF §12). What matters is that
 * the card is invisible to the other FIVE phones at the database level, and
 * that's round_items' RLS, not a promise.
 *
 * VISUAL IDENTITY: a stage. Crimson curtain wash, the card thrown up in
 * lights for the performer, and a hard black-out for everyone else so the
 * only thing on their screen is the person in front of them.
 */

const ACCENT = "#e11d48";
const ITEMS = 5;
const OPPOSITE_RATE = 0.4;

type Mode = "straight" | "opposite";

function isMode(v: unknown): v is Mode {
  return v === "straight" || v === "opposite";
}

function ModeBanner({ mode }: { mode: Mode }) {
  if (mode === "straight") {
    return (
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-mute">
        Straight up
      </p>
    );
  }
  return (
    <div
      className="rise mx-auto w-fit rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em]"
      style={{ background: ACCENT, color: "white" }}
    >
      ✦ Opposite Day ✦
    </div>
  );
}

/** The performer's view — the one screen in the room with the word on it. */
function TheCard({ word, mode }: { word: string; mode: Mode }) {
  return (
    <div
      className="rise relative overflow-hidden rounded-3xl border-2 p-8 text-center"
      style={{
        borderColor: ACCENT,
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in oklab, ${ACCENT} 32%, var(--color-ink-2)), var(--color-ink-2) 75%)`,
      }}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
        {mode === "opposite" ? "Act the OPPOSITE of" : "Act this out"}
      </p>
      <p className="mt-3 text-4xl font-black leading-none tracking-tight">{word}</p>
      <p className="mt-5 text-xs leading-relaxed text-mute">
        No talking, no spelling it out, no pointing at things in the room.
        {mode === "opposite" && " They're guessing the word above, not what you're doing."}
      </p>
    </div>
  );
}

function GuessBox({ idx, disabled }: { idx: number; disabled: boolean }) {
  const { round, submissions, call } = useRoom();
  const { me } = usePlayer();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = submissions.find(
    (s) => s.idx === idx && s.player_id === me?.id && s.kind === "guess",
  );

  async function send() {
    if (!round || !text.trim() || busy) return;
    setBusy(true);
    try {
      await call("submit_answer", {
        p_round: round.id,
        p_idx: idx,
        p_kind: "guess",
        p_value: text.trim(),
      });
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return null;

  return (
    <div className="rise mt-6 space-y-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mine ? "change your guess…" : "one word — what's on their card?"}
        className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-4 text-center text-lg font-bold outline-none focus:border-[color:var(--acc)]"
        style={{ ["--acc" as string]: ACCENT }}
      />
      <PrimaryButton
        onClick={() => void send()}
        disabled={!text.trim() || busy}
        style={{ background: ACCENT, color: "white" }}
      >
        {mine ? "Change it" : "Lock in guess"}
      </PrimaryButton>
      {mine && (
        <p className="text-center text-xs text-mute">
          In: <span className="font-bold text-paper">{mine.value}</span> — change it right up
          until the reveal.
        </p>
      )}
    </div>
  );
}

function Reveal({ idx, word }: { idx: number; word: string | null }) {
  const { submissions } = useRoom();
  const seats = useSeats();
  const guesses = submissions.filter((s) => s.idx === idx && s.kind === "guess");

  return (
    <div className="rise mt-6 space-y-4">
      <div
        className="rounded-3xl border-2 p-6 text-center"
        style={{ borderColor: ACCENT, background: `color-mix(in oklab, ${ACCENT} 14%, transparent)` }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-mute">
          The card said
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight">{word ?? "—"}</p>
      </div>

      <div className="space-y-2">
        {guesses.map((g) => {
          const seat = seats.find((s) => s.id === g.player_id);
          const right =
            !!word && g.value.trim().toLowerCase() === word.trim().toLowerCase();
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
              style={{
                borderColor: right ? ACCENT : "var(--color-line)",
                background: right ? `color-mix(in oklab, ${ACCENT} 12%, transparent)` : undefined,
              }}
            >
              <span className="text-lg">{seat?.emoji ?? "👤"}</span>
              <span className="flex-1 text-sm font-semibold">{g.value}</span>
              <span className="text-xs font-bold text-mute">{seat?.name}</span>
            </div>
          );
        })}
        {guesses.length === 0 && (
          <p className="text-center text-xs text-mute">Nobody got a guess in.</p>
        )}
      </div>
      <p className="text-center text-xs text-mute">
        Anyone who typed it — or anything close enough — takes 100.
      </p>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, secrets, isHost, call } = useRoom();
  const seats = useSeats();
  const total = useTotalItems();
  const here = useCurrentItems();

  const marker = here.find((i) => i.kind === "deck");
  const card = here.find((i) => i.kind === "private");

  if (!round || !marker) {
    return (
      <GameShell icon="🎭" title="Act It Out">
        <WaitingOnHost label="Setting the stage…" />
      </GameShell>
    );
  }

  const cursor = round.item_cursor;
  const isLast = cursor >= total - 1;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";
  const mode: Mode = isMode(marker.meta?.mode) ? marker.meta.mode : "straight";
  const performerId = typeof marker.meta?.performer === "string" ? marker.meta.performer : null;
  const performer = seats.find((s) => s.id === performerId);
  const iAmPerformer = Boolean(me && performerId === me.id);
  const word =
    (secrets.find((s) => s.idx === cursor)?.payload as { answer?: string } | undefined)?.answer ??
    null;

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_exact", { p_round: round.id, p_idx: round.item_cursor, p_points: 100 });
  }

  async function next() {
    if (!round) return;
    if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
    else await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
  }

  return (
    <GameShell
      icon="🎭"
      title="Act It Out"
      subtitle={`Card ${cursor + 1} of ${total}`}
      dock={
        isHost && !isDone ? (
          <div className="pt-3">
            <PrimaryButton
              onClick={() => void (revealed ? next() : reveal())}
              style={{ background: ACCENT, color: "white" }}
            >
              {revealed ? (isLast ? "Finish round" : "Next performer →") : "Time's up — reveal"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${ACCENT}, transparent 55%)`,
          opacity: mode === "opposite" ? 0.22 : 0.1,
        }}
      />

      <ModeBanner mode={mode} />

      <p className="mt-4 text-center text-sm text-mute">
        <span className="text-lg">{performer?.emoji}</span>{" "}
        <span className="font-black text-paper">{performer?.name ?? "Someone"}</span> is up.
      </p>

      {!revealed && iAmPerformer && card && (
        <div className="mt-5">
          <TheCard word={card.content} mode={mode} />
        </div>
      )}

      {!revealed && !iAmPerformer && (
        <>
          <div className="rise mt-5 rounded-3xl border border-dashed border-line p-7 text-center">
            <p className="text-sm leading-relaxed text-mute">
              {mode === "opposite" ? (
                <>
                  They&apos;re acting the <span className="font-black text-paper">opposite</span> of
                  their card. Type the word that&apos;s{" "}
                  <span className="font-black text-paper">on it</span>, not the one
                  they&apos;re showing you.
                </>
              ) : (
                <>Watch. Type the word on their card.</>
              )}
            </p>
          </div>
          <GuessBox idx={cursor} disabled={false} />
        </>
      )}

      {!revealed && iAmPerformer && (
        <p className="mt-5 text-center text-xs text-mute">
          Everyone else is typing their guess. The host reveals when you&apos;re done.
        </p>
      )}

      {revealed && <Reveal idx={cursor} word={word} />}
    </GameShell>
  );
}

export const actItOut: GameModule = {
  id: "act_it_out",
  title: "Act It Out",
  hall: "huddle",
  icon: "🎭",
  blurb: "Charades — except two cards in five, you act the opposite.",
  source: { kind: "private" },
  origin: "group",
  minutes: 12,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 2) throw new Error("need at least two people holding a profile");

    const cards = pickN(OPPOSITES, ITEMS);
    const start = Math.floor(Math.random() * playing.length);

    const roundId = (await call("start_deck_round", {
      p_game: "act_it_out",
      p_hall: "huddle",
    })) as string;

    // Public marker per item: who's performing and which way to read it.
    // The word itself never touches this row — that's the private deal
    // below, one per item, visible to one phone.
    await call("deal_deck", {
      p_round: roundId,
      p_items: cards.map((_, i) => ({
        content: "On stage",
        meta: {
          performer: playing[(start + i) % playing.length].id,
          mode: Math.random() < OPPOSITE_RATE ? "opposite" : "straight",
        },
      })),
    });

    for (let i = 0; i < cards.length; i++) {
      await call("deal_private_answers", {
        p_round: roundId,
        p_idx: i,
        p_to: playing[(start + i) % playing.length].id,
        p_content: cards[i].word,
        p_answers: [cards[i].word, ...cards[i].accept],
      });
    }

    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
