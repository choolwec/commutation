"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { useSeats, useTotalItems, shuffle } from "@/games/common";
import { SPELLING_WORDS, type SpellingWord } from "@/config/their-rounds";

/**
 * SPELL IT OUT — a spelling bee where nobody gets knocked out
 * (THEIR_ROUNDS §1.2).
 *
 * The resolved spec was explicit on the two things that make this work at
 * six people: no elimination and no turns. One reader gets the word
 * privately and says it out loud; everyone else spells it at the same time;
 * the reveal puts every attempt side by side, which is where the laughs
 * are, and score_exact (0015) settles it without anyone adjudicating.
 *
 * Simultaneous rather than round-the-table is doing real work here: a
 * knockout bee has five people watching one person for four minutes, and
 * the person out first watches for twenty. Everybody spells every word.
 *
 * The reader gets a sentence to read as well as the word — a real bee gives
 * you the word in a sentence, and without one a reader tends to
 * over-enunciate their way into spelling it out loud by accident.
 *
 * (The reader can obviously see the spelling on their own screen. That's
 * fine and it's why score_exact excludes the card's holder from its own
 * payout — see 0015. The word is said out loud to the room anyway; the only
 * secret in this game is how it's written, and the reader is the one person
 * who isn't playing for it.)
 *
 * VISUAL IDENTITY: chalk on slate. Near-white accent, letter-spaced
 * monospace attempts at the reveal so a missing 'r' is visible at a glance.
 */

const ACCENT = "#cbd5e1";
const WORDS = 8;
const PER_WORD = 100;

const TIER_LABEL: Record<number, string> = { 1: "Warm-up", 2: "Getting mean", 3: "Cruel" };

function Attempt({
  emoji,
  name,
  value,
  correct,
}: {
  emoji: string;
  name: string;
  value: string;
  correct: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: correct ? ACCENT : "var(--color-line)",
        background: correct ? `color-mix(in oklab, ${ACCENT} 12%, transparent)` : undefined,
      }}
    >
      <span className="text-lg">{emoji}</span>
      <span
        className={`flex-1 font-mono text-sm tracking-[0.18em] ${
          correct ? "font-bold" : "text-mute"
        }`}
      >
        {value.trim().toUpperCase()}
      </span>
      <span className="shrink-0 text-[11px] font-bold text-mute">{correct ? "✓" : name}</span>
    </div>
  );
}

function SpellBox({ idx }: { idx: number }) {
  const { round, submissions, call } = useRoom();
  const { me } = usePlayer();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = submissions.find(
    (s) => s.idx === idx && s.player_id === me?.id && s.kind === "spelling",
  );

  async function send() {
    if (!round || !text.trim() || busy) return;
    setBusy(true);
    try {
      await call("submit_answer", {
        p_round: round.id,
        p_idx: idx,
        p_kind: "spelling",
        p_value: text.trim(),
      });
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise mt-6 space-y-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={mine ? "change it…" : "spell it"}
        className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-4 text-center font-mono text-xl tracking-[0.2em] outline-none focus:border-paper"
      />
      <PrimaryButton
        onClick={() => void send()}
        disabled={!text.trim() || busy}
        style={{ background: ACCENT, color: "var(--color-ink)" }}
      >
        {mine ? "Change it" : "Lock it in"}
      </PrimaryButton>
      <p className="text-center text-xs text-mute">
        {mine ? (
          <>
            In:{" "}
            <span className="font-mono font-bold tracking-[0.15em] text-paper">
              {mine.value.toUpperCase()}
            </span>{" "}
            — autocorrect is off, that&apos;s on you now.
          </>
        ) : (
          "Everyone spells at once. Nobody's out, nobody's waiting."
        )}
      </p>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, secrets, submissions, isHost, call } = useRoom();
  const seats = useSeats();
  const total = useTotalItems();
  const here = useCurrentItems();

  const marker = here.find((i) => i.kind === "deck");
  const card = here.find((i) => i.kind === "private");

  if (!round || !marker) {
    return (
      <GameShell icon="🔤" title="Spell It Out">
        <WaitingOnHost label="Opening the dictionary…" />
      </GameShell>
    );
  }

  const cursor = round.item_cursor;
  const isLast = cursor >= total - 1;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";
  const readerId = typeof marker.meta?.reader === "string" ? marker.meta.reader : null;
  const tier = typeof marker.meta?.tier === "number" ? marker.meta.tier : 1;
  const reader = seats.find((s) => s.id === readerId);
  const iAmReader = Boolean(me && readerId === me.id);
  const answer =
    (secrets.find((s) => s.idx === cursor)?.payload as { answer?: string } | undefined)?.answer ??
    null;
  // Only populated once show_submissions flips at the reveal — before that
  // RLS hands each phone nothing but its own row. Used for the reveal only.
  const attempts = submissions.filter((s) => s.idx === cursor && s.kind === "spelling");

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_exact", { p_round: round.id, p_idx: round.item_cursor, p_points: PER_WORD });
  }

  async function next() {
    if (!round) return;
    if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
    else await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
  }

  let readerCard: SpellingWord | null = null;
  if (card) {
    try {
      readerCard = JSON.parse(card.content) as SpellingWord;
    } catch {
      readerCard = null;
    }
  }

  return (
    <GameShell
      icon="🔤"
      title="Spell It Out"
      subtitle={`Word ${cursor + 1} of ${total} · ${TIER_LABEL[tier] ?? ""}`}
      dock={
        isHost && !isDone ? (
          <div className="pt-3">
            <PrimaryButton
              onClick={() => void (revealed ? next() : reveal())}
              style={{ background: ACCENT, color: "var(--color-ink)" }}
            >
              {revealed ? (isLast ? "Finish round" : "Next word →") : "Everyone's in — reveal"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div className="rise text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-mute">Reading it out</p>
        <p className="mt-1 text-xl font-black tracking-tight">
          {reader?.emoji} {reader?.name ?? "—"}
        </p>
      </div>

      {!revealed && iAmReader && readerCard && (
        <div
          className="rise mt-6 rounded-3xl border-2 p-6 text-center"
          style={{ borderColor: ACCENT, background: "var(--color-ink-2)" }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-mute">
            Say this word out loud
          </p>
          <p className="mt-3 font-mono text-3xl font-black tracking-[0.1em]">
            {readerCard.word.toUpperCase()}
          </p>
          <p className="mt-4 border-t border-line pt-4 text-sm italic leading-relaxed text-paper/80">
            &ldquo;{readerCard.say}&rdquo;
          </p>
          <p className="mt-3 text-xs text-mute">
            Say the word, then the sentence, then the word again. Don&apos;t spell it, and
            don&apos;t lean on any one letter.
          </p>
        </div>
      )}

      {!revealed && !iAmReader && (
        <>
          <div className="rise mt-6 rounded-3xl border border-dashed border-line p-7 text-center">
            <p className="text-sm text-mute">
              Listen. Ask for it in a sentence if you need it — that&apos;s allowed, and it
              won&apos;t help you.
            </p>
          </div>
          <SpellBox idx={cursor} />
        </>
      )}

      {/* No "3 of 5 are in" counter here on purpose: submissions are
          author-scoped until show_submissions flips (0005's RLS), so this
          phone can only ever see its own row — a count would read 0 all
          round and be a lie, not a limitation worth working around. */}
      {!revealed && iAmReader && (
        <p className="mt-5 text-center text-xs text-mute">
          You&apos;re not spelling this one — you get the next word. Read it again for anyone
          who asks.
        </p>
      )}

      {revealed && (
        <div className="rise mt-6 space-y-4">
          <div
            className="rounded-3xl border-2 p-6 text-center"
            style={{
              borderColor: ACCENT,
              background: `color-mix(in oklab, ${ACCENT} 10%, transparent)`,
            }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-mute">
              It was spelt
            </p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.2em]">
              {(answer ?? "—").toUpperCase()}
            </p>
          </div>

          <div className="space-y-2">
            {attempts.map((a) => {
              const seat = seats.find((s) => s.id === a.player_id);
              return (
                <Attempt
                  key={a.id}
                  emoji={seat?.emoji ?? "👤"}
                  name={seat?.name ?? ""}
                  value={a.value}
                  correct={
                    !!answer && a.value.trim().toLowerCase() === answer.trim().toLowerCase()
                  }
                />
              );
            })}
            {attempts.length === 0 && (
              <p className="text-center text-xs text-mute">Nobody chanced it.</p>
            )}
          </div>
          <p className="text-center text-xs text-mute">Every correct spelling takes 100.</p>
        </div>
      )}
    </GameShell>
  );
}

export const spellItOut: GameModule = {
  id: "spell_it_out",
  title: "Spell It Out",
  hall: "huddle",
  icon: "🔤",
  blurb: "A spelling bee where everyone spells at once and nobody goes out.",
  source: { kind: "private" },
  origin: "group",
  minutes: 10,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 2) throw new Error("need at least two people holding a profile");

    // Escalating on purpose (§1.2 stores the tier in meta): easy words first
    // so everyone's still in it, and the round is actually decided by the
    // last two or three.
    const byTier = [1, 2, 3].map((t) => shuffle(SPELLING_WORDS.filter((w) => w.tier === t)));
    const chosen: SpellingWord[] = [];
    for (let i = 0; chosen.length < WORDS; i++) {
      const tier = byTier[Math.min(2, Math.floor((i / WORDS) * 3))];
      const next = tier.pop() ?? byTier.flat().pop();
      if (!next) break;
      chosen.push(next);
    }

    const start = Math.floor(Math.random() * playing.length);

    const roundId = (await call("start_deck_round", {
      p_game: "spell_it_out",
      p_hall: "huddle",
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: chosen.map((w, i) => ({
        content: "Listen up",
        meta: { reader: playing[(start + i) % playing.length].id, tier: w.tier },
      })),
    });

    for (let i = 0; i < chosen.length; i++) {
      await call("deal_private", {
        p_round: roundId,
        p_idx: i,
        p_to: playing[(start + i) % playing.length].id,
        p_content: JSON.stringify(chosen[i]),
        p_answer: chosen[i].word,
      });
    }

    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
