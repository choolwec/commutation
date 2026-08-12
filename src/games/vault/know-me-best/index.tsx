"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";

/**
 * KNOW ME BEST — one person on the hot seat, everyone else predicts their
 * real answer to a personal survey question, revealed side by side.
 *
 * The prompt ("your worst habit") is always public — round_items.content.
 * The subject's real answer is the sealed part, dealt via
 * deal_hidden_answer() (0008) into round_secrets, unreadable until this
 * round hits `reveal`. Guesses go through the same submit_answer()/
 * submissions path as everywhere else, which is why they also stay hidden
 * from each other until the host reveals (submissions are yours until
 * `show_submissions` flips, which set_phase('reveal') does automatically).
 *
 * VISUAL IDENTITY: a case file. Gold accent, monospace stamps, a stacked
 * index-card look for the prompt, and a reveal that "unseals" the true
 * answer with a clip-path wipe rather than just popping into view.
 */

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

const PROMPTS: Record<string, string> = {
  irrational_fear: "An irrational fear they actually have",
  worst_habit: "Their worst habit",
  overestimate: "Something people always get wrong about them",
  cry: "The last thing that made them cry",
  flex: "Something they're genuinely, unreasonably good at",
  guilty_pleasure: "The guilty pleasure they'd deny in public",
  never_told: "Something about them nobody in this group knows",
};

const QUESTION_IDS = Object.keys(PROMPTS);
const MAX_QUESTIONS = 5;
const MIN_QUESTIONS = 2;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

/** Scoped keyframes for this game only — no shared CSS file gets touched. */
function KmbStyle() {
  return (
    <style>{`
      .kmb-stack { position: relative; }
      .kmb-stack::before {
        content: "";
        position: absolute;
        inset: 8px -8px -8px 8px;
        background: var(--color-ink-3);
        border: 1px solid var(--color-line);
        border-radius: 1.5rem;
        transform: rotate(2deg);
        z-index: -1;
      }
      .kmb-card { transform: rotate(-1deg); }
      @keyframes kmb-unseal {
        from { clip-path: inset(0 100% 0 0); opacity: 0; }
        to   { clip-path: inset(0 0 0 0); opacity: 1; }
      }
      .kmb-unseal { animation: kmb-unseal 0.7s cubic-bezier(0.16,1,0.3,1) both; }
    `}</style>
  );
}

function GuessBox({ idx }: { idx: number }) {
  const { round, submissions, call } = useRoom();
  const { me } = usePlayer();
  const [text, setText] = useState("");

  const mine = submissions.find(
    (s) => s.player_id === me?.id && s.idx === idx && s.kind === "guess",
  );

  async function lockIn() {
    if (!round || !text.trim()) return;
    await call("submit_answer", {
      p_round: round.id,
      p_idx: idx,
      p_kind: "guess",
      p_value: text.trim(),
    });
  }

  if (mine) {
    return (
      <div className="rise rounded-2xl border border-dashed border-gold/40 px-4 py-4 text-center">
        <p style={MONO} className="text-[10px] uppercase tracking-[0.25em] text-gold">
          statement filed
        </p>
        <p className="mt-2 text-sm text-mute">
          The host reveals when everyone&apos;s in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you think they said?"
        className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none transition placeholder:text-mute/60 focus:border-gold/60"
      />
      <PrimaryButton
        onClick={() => void lockIn()}
        disabled={!text.trim()}
        className="!bg-gold"
      >
        Lock in guess
      </PrimaryButton>
    </div>
  );
}

function RevealPanel({ idx }: { idx: number }) {
  const { roster } = usePlayer();
  const { round, secrets, submissions, isHost, call } = useRoom();
  const secret = secrets.find((s) => s.idx === idx);
  const guesses = submissions.filter((s) => s.idx === idx && s.kind === "guess");
  const realAnswer = (secret?.payload as { value?: string } | undefined)?.value;

  async function award(playerId: string) {
    if (!round) return;
    await call("award_points", {
      p_player: playerId,
      p_points: 100,
      p_reason: "closest_guess",
      p_round: round.id,
    });
  }

  return (
    <div className="rise mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p style={MONO} className="text-[10px] uppercase tracking-[0.25em] text-mute">
            guesses
          </p>
          {guesses.length === 0 ? (
            <p className="text-sm text-mute">Nobody guessed.</p>
          ) : (
            guesses.map((g) => {
              const p = roster.find((r) => r.id === g.player_id);
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-line bg-ink-2 px-3 py-2.5"
                >
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: p?.color }}
                  >
                    {p?.emoji} {p?.name ?? "someone"}
                  </p>
                  <p className="mt-1 text-xs leading-snug">{g.value}</p>
                </div>
              );
            })
          )}
        </div>

        <div
          className="kmb-unseal rounded-2xl border p-4"
          style={{ borderColor: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 12%, var(--color-ink-2))" }}
        >
          <p style={MONO} className="text-[10px] uppercase tracking-[0.25em] text-gold">
            the truth
          </p>
          <p className="mt-2 text-sm font-bold leading-snug">
            {realAnswer || "(skipped this one)"}
          </p>
        </div>
      </div>

      {isHost && guesses.length > 0 && (
        <div>
          <p style={MONO} className="mb-2 text-center text-[10px] uppercase tracking-[0.25em] text-mute">
            closest guess? tap to award 100
          </p>
          <div className="grid grid-cols-3 gap-2">
            {guesses.map((g) => {
              const p = roster.find((r) => r.id === g.player_id);
              if (!p) return null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => void award(p.id)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-ink-2 px-2 py-3 transition active:scale-95"
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-semibold">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Phone() {
  const { me, roster } = usePlayer();
  const { round, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();

  const cursor = round?.item_cursor ?? 0;
  const isLast = round ? round.item_cursor >= totalItems - 1 : false;
  const revealed = round?.phase === "reveal" || round?.phase === "done";
  const isSubject = Boolean(me && round?.subject === me.id);
  const subjectName = roster.find((p) => p.id === round?.subject)?.name ?? "them";

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function next() {
    if (!round) return;
    if (isLast) {
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } else {
      await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
    }
  }

  if (!round || !item) {
    return (
      <GameShell icon="🔒" title="Know Me Best">
        <WaitingOnHost label="Putting someone on the hot seat…" />
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="🔒"
      title="Know Me Best"
      subtitle={`Question ${cursor + 1} of ${totalItems}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={() => void reveal()} className="!bg-gold">
                Reveal
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void next()} className="!bg-gold">
                {isLast ? "Finish round" : "Next question →"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <KmbStyle />

      <div className="kmb-stack">
        <div
          className="kmb-card rise rounded-3xl border p-6"
          style={{
            borderColor: "color-mix(in oklab, var(--color-gold) 50%, var(--color-line))",
            background: "color-mix(in oklab, var(--color-gold) 5%, var(--color-ink-2))",
          }}
        >
          <p style={MONO} className="text-[10px] uppercase tracking-[0.3em] text-gold">
            subject: {subjectName}
          </p>
          <p className="mt-3 text-center text-lg font-bold leading-snug">
            {item.content}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {isSubject ? (
          <div className="rise rounded-2xl border border-dashed border-gold/40 px-4 py-6 text-center">
            <p style={MONO} className="text-[10px] uppercase tracking-[0.3em] text-gold">
              access restricted
            </p>
            <p className="mt-2 text-sm text-mute">
              You&apos;re on the hot seat. Sit tight — everyone else is
              guessing what you said.
            </p>
          </div>
        ) : !revealed ? (
          <GuessBox idx={cursor} />
        ) : (
          <RevealPanel idx={cursor} />
        )}
      </div>
    </GameShell>
  );
}

export const knowMeBest: GameModule = {
  id: "know_me_best",
  title: "Know Me Best",
  hall: "vault",
  icon: "🔒",
  blurb: "One hot seat, one question. Guess what they really said.",
  source: { kind: "survey", questionIds: QUESTION_IDS, items: MAX_QUESTIONS },
  minutes: 10,
  async start({ call, roster }) {
    const eligible = roster.filter((p) => p.claimed_by);
    if (eligible.length === 0) {
      throw new Error("nobody has claimed a profile yet");
    }
    const subject = eligible[Math.floor(Math.random() * eligible.length)];

    const roundId = (await call("start_deck_round", {
      p_game: "know_me_best",
      p_hall: "vault",
      p_subject: subject.id,
    })) as string;

    const pool = shuffle(QUESTION_IDS);
    let idx = 0;

    for (const questionId of pool) {
      if (idx >= MAX_QUESTIONS) break;
      const ok = (await call("deal_hidden_answer", {
        p_round: roundId,
        p_idx: idx,
        p_subject: subject.id,
        p_question_id: questionId,
        p_prompt: PROMPTS[questionId],
      })) as boolean;
      if (ok) idx += 1;
    }

    if (idx < MIN_QUESTIONS) {
      throw new Error(
        `not enough answers for anyone yet — ${subject.name} hasn't filled in enough of the survey`,
      );
    }
  },
  // Fake prompts + fake answers, so testing never reads a real survey
  // answer early — same reasoning as who-wrote-it's startTest.
  async startTest({ call, roster }) {
    const eligible = roster.filter((p) => p.claimed_by);
    if (eligible.length === 0) throw new Error("nobody has claimed a profile yet");
    const subject = eligible[Math.floor(Math.random() * eligible.length)];

    const roundId = (await call("start_deck_round", {
      p_game: "know_me_best",
      p_hall: "vault",
      p_subject: subject.id,
      p_test: true,
    })) as string;

    const fake: [string, string][] = [
      ["A fear they actually have (test data)", "spiders, allegedly"],
      ["Their worst habit (test data)", "leaves cupboard doors open"],
      ["Something people get wrong about them (test data)", "that they're always this calm"],
    ];
    for (let i = 0; i < fake.length; i++) {
      await call("deal_test_hidden", {
        p_round: roundId,
        p_idx: i,
        p_subject: subject.id,
        p_prompt: fake[i][0],
        p_answer: fake[i][1],
      });
    }
  },
  PhoneView: Phone,
};
