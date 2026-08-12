"use client";

import { useMemo, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";

/**
 * THE DEEP END — rotating deep questions. Content is public the moment
 * it's dealt (unlike Who Wrote It?, the text itself isn't the secret) —
 * only the author is sealed, revealed at the end for fun. Others react
 * "same" / "never knew that" rather than guessing anything.
 *
 * Uses the same start_round()/deal_from_survey() path as Who Wrote It?:
 * content lands in round_items immediately readable, author sealed in
 * round_secrets until reveal.
 *
 * VISUAL IDENTITY: deep water. A cyan-into-violet gradient wash behind the
 * question, and reactions surface as little tags that rise and fade like
 * bubbles when tapped, instead of just incrementing a counter.
 */

const QUESTION_IDS = ["three_am", "five_years", "changed", "deep_q"];
const ITEMS = 5;

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

/** Scoped keyframes for this game only. */
function TdeStyle() {
  return (
    <style>{`
      @keyframes tde-wash {
        0%, 100% { background-position: 0% 0%, 100% 100%; }
        50% { background-position: 20% 10%, 80% 90%; }
      }
      .tde-wash {
        background-image:
          radial-gradient(circle at 15% 15%, color-mix(in oklab, var(--color-cyan) 22%, transparent), transparent 55%),
          radial-gradient(circle at 85% 85%, color-mix(in oklab, var(--color-violet) 22%, transparent), transparent 55%);
        animation: tde-wash 10s ease-in-out infinite;
      }
      @keyframes tde-bubble {
        0%   { transform: translateY(0) scale(0.85); opacity: 0; }
        18%  { opacity: 1; transform: translateY(-8px) scale(1); }
        100% { transform: translateY(-64px) scale(1.05); opacity: 0; }
      }
      .tde-bubble {
        animation: tde-bubble 1.1s ease-out forwards;
      }
    `}</style>
  );
}

type Bubble = { id: number; label: string; x: number };

function ReactionButton({
  label,
  count,
  active,
  accent,
  onTap,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: "cyan" | "violet";
  onTap: () => void;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextId = useRef(0);

  function tap() {
    const id = nextId.current++;
    setBubbles((b) => [...b, { id, label, x: Math.random() * 40 - 20 }]);
    setTimeout(() => {
      setBubbles((b) => b.filter((bb) => bb.id !== id));
    }, 1100);
    onTap();
  }

  const color = accent === "cyan" ? "var(--color-cyan)" : "var(--color-violet)";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="tde-bubble absolute rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              borderColor: color,
              color,
              background: "var(--color-ink-2)",
              transform: `translateX(${b.x}px)`,
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={tap}
        className="w-full rounded-2xl border px-4 py-4 text-center transition active:scale-95"
        style={
          active
            ? { borderColor: color, background: `color-mix(in oklab, ${color} 16%, var(--color-ink-2))` }
            : { borderColor: "var(--color-line)", background: "var(--color-ink-2)" }
        }
      >
        <span className="block text-2xl font-black">{count}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-mute">
          {label}
        </span>
      </button>
    </div>
  );
}

function Phone() {
  const { me, roster } = usePlayer();
  const { round, secrets, votes, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();

  const cursor = round?.item_cursor ?? 0;
  const secret = secrets.find((s) => s.idx === cursor);
  const myVote = votes.find((v) => v.player_id === me?.id && v.idx === cursor);
  const isLast = round ? round.item_cursor >= totalItems - 1 : false;
  const revealed = round?.phase === "reveal" || round?.phase === "done";
  const writer = revealed ? roster.find((p) => p.id === secret?.author) : undefined;

  const sameCount = votes.filter((v) => v.idx === cursor && v.value === "same").length;
  const neverCount = votes.filter((v) => v.idx === cursor && v.value === "never").length;

  async function react(value: "same" | "never") {
    if (!round) return;
    await call("cast_vote", { p_round: round.id, p_idx: cursor, p_value: value });
  }

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
      <GameShell icon="🔒" title="The Deep End">
        <TdeStyle />
        <WaitingOnHost label="Dealing a question…" />
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="🔒"
      title="The Deep End"
      subtitle={`Question ${cursor + 1} of ${totalItems}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={() => void reveal()}>Whose was it?</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void next()}>
                {isLast ? "Finish round" : "Next question →"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <TdeStyle />

      <div className="tde-wash rise rounded-3xl border border-line p-6 text-center">
        <p className="text-lg font-bold leading-snug">{item.content}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ReactionButton
          label="Same"
          count={sameCount}
          active={myVote?.value === "same"}
          accent="cyan"
          onTap={() => void react("same")}
        />
        <ReactionButton
          label="Never knew that"
          count={neverCount}
          active={myVote?.value === "never"}
          accent="violet"
          onTap={() => void react("never")}
        />
      </div>

      {revealed && (
        <div className="rise mt-6 text-center">
          {writer ? (
            <div
              className="inline-flex flex-col items-center gap-2 rounded-3xl border px-6 py-5"
              style={{ borderColor: writer.color, background: `${writer.color}18` }}
            >
              <span className="text-3xl">{writer.emoji}</span>
              <span className="text-xl font-black">{writer.name}</span>
              <span className="text-xs text-mute">answered this one</span>
            </div>
          ) : (
            <p className="text-mute">Nobody claimed this one.</p>
          )}
        </div>
      )}
    </GameShell>
  );
}

export const theDeepEnd: GameModule = {
  id: "the_deep_end",
  title: "The Deep End",
  hall: "vault",
  icon: "🔒",
  blurb: "A real question, read aloud. React same, or never knew that.",
  source: { kind: "survey", questionIds: QUESTION_IDS, items: ITEMS },
  minutes: 10,
  async start({ call }) {
    await call("start_round", {
      p_game: "the_deep_end",
      p_hall: "vault",
      p_question_ids: QUESTION_IDS,
      p_items: ITEMS,
    });
  },
  // Fake deep-question answers, attributed at random — never touches
  // survey_responses, see who-wrote-it's startTest for the reasoning.
  async startTest({ call, roster }) {
    const claimed = roster.filter((p) => p.claimed_by);
    const fakes = [
      "This is placeholder test content, not a real answer — everything about this line is made up for testing.",
      "Same here — fake test content, just checking the round actually deals and reveals correctly.",
    ];
    const roundId = (await call("start_round", {
      p_game: "the_deep_end",
      p_hall: "vault",
      p_test: true,
    })) as string;
    for (let i = 0; i < fakes.length; i++) {
      const author = claimed[i % claimed.length]?.id;
      await call("deal_test_pair", { p_round: roundId, p_idx: i, p_content: fakes[i], p_author: author });
    }
  },
  PhoneView: Phone,
};
