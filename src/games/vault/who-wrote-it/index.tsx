"use client";

import { useMemo } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import {
  ContentCard,
  GameShell,
  PrimaryButton,
  WaitingOnHost,
} from "@/components/play/GameShell";
import { PersonVote } from "@/components/play/PersonVote";

/**
 * WHO WROTE IT? — the centerpiece. PLAN.md: "the reveals only land if
 * genuinely nobody has read them first, including whoever's building the
 * app." This is that promise, running: the confession text comes from
 * round_items (readable), the author from round_secrets (sealed until this
 * exact round hits `reveal`). Nobody — not other players, not the host, not
 * this component before the reveal — can query their way to the answer.
 */

const QUESTION_IDS = [
  "confession",
  "worst_thing",
  "lied_about",
  "unpopular_confession",
  "embarrassing",
];

function Phone() {
  const { me } = usePlayer();
  const { round, secrets, votes, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();

  const secret = secrets.find((s) => s.idx === round?.item_cursor);
  const myVote = votes.find(
    (v) => v.player_id === me?.id && v.idx === round?.item_cursor,
  );
  const isLast = round ? round.item_cursor >= totalItems - 1 : false;

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_item", { p_round: round.id, p_idx: round.item_cursor });
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
      <GameShell icon="🔒" title="Who Wrote It?">
        <WaitingOnHost label="Dealing confessions…" />
      </GameShell>
    );
  }

  const revealed = round.phase === "reveal" || round.phase === "done";
  const author = revealed
    ? secret?.author
    : undefined;

  return (
    <GameShell
      icon="🔒"
      title="Who Wrote It?"
      subtitle={`Confession ${round.item_cursor + 1} of ${totalItems}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={reveal}>Reveal</PrimaryButton>
            ) : (
              <PrimaryButton onClick={next}>
                {isLast ? "Finish round" : "Next confession →"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <ContentCard>“{item.content}”</ContentCard>

      <div className="mt-6">
        {!revealed ? (
          <>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
              Who wrote this?
            </p>
            <PersonVote idx={round.item_cursor} exclude={me ? [me.id] : []} />
            {myVote && (
              <p className="mt-4 text-center text-xs text-mute">
                Locked in — the host reveals when everyone&apos;s guessed.
              </p>
            )}
          </>
        ) : (
          <RevealPanel author={author} idx={round.item_cursor} />
        )}
      </div>
    </GameShell>
  );
}

function RevealPanel({ author, idx }: { author?: string | null; idx: number }) {
  const { roster } = usePlayer();
  const { votes } = useRoom();
  const writer = roster.find((p) => p.id === author);
  const guessers = votes.filter((v) => v.idx === idx);
  const correct = guessers.filter((v) => v.value === author);

  return (
    <div className="rise space-y-4 text-center">
      {writer ? (
        <div
          className="inline-flex flex-col items-center gap-2 rounded-3xl border px-6 py-5"
          style={{ borderColor: writer.color, background: `${writer.color}18` }}
        >
          <span className="text-3xl">{writer.emoji}</span>
          <span className="text-xl font-black">{writer.name}</span>
          <span className="text-xs text-mute">wrote it</span>
        </div>
      ) : (
        <p className="text-mute">Nobody claimed this one.</p>
      )}
      <p className="text-sm text-mute">
        {correct.length} of {guessers.length} guessed right · {writer?.name ?? "the author"}{" "}
        earns {(guessers.length - correct.length) * 50} for staying hidden
      </p>
    </div>
  );
}

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

export const whoWroteIt: GameModule = {
  id: "who_wrote_it",
  title: "Who Wrote It?",
  hall: "vault",
  icon: "🔒",
  blurb: "A real confession. Guess who wrote it — or stay hidden.",
  source: { kind: "survey", questionIds: QUESTION_IDS, items: 6 },
  minutes: 12,
  async start({ call }) {
    await call("start_round", {
      p_game: "who_wrote_it",
      p_hall: "vault",
      p_question_ids: QUESTION_IDS,
      p_items: 6,
    });
  },
  // Fake confessions, obviously fake, attributed at random to real crew
  // members — never reads survey_responses, so testing this can never
  // expose a real one early. See migration 0011's header for why this
  // exists as a separate path rather than just running start() early.
  async startTest({ call, roster }) {
    const claimed = roster.filter((p) => p.claimed_by);
    const fakes = [
      "I once ate an entire packet of biscuits and blamed the dog we don't have.",
      "I've rehearsed an argument with someone in the shower that never actually happened.",
      "I told everyone I was 'stuck in traffic' from my own driveway.",
      "I still don't know how to parallel park and have never once admitted it.",
    ];
    const roundId = (await call("start_round", {
      p_game: "who_wrote_it",
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
