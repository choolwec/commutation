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
 * MOST LIKELY TO — secret vote for a person, live bar-chart reveal.
 *
 * Content is the group's own "most likely to ___" prompts from the survey
 * (question_id: most_likely_prompt, up to 3 per person = up to 18 possible).
 * Unlike Who Wrote It?, authorship of the PROMPT isn't the point of this
 * game — the vote is about who the room picks, not who wrote the line. The
 * prompt text lands in round_items (readable, by design — see
 * deal_from_survey in 0006), authorship still seals into round_secrets and
 * is only surfaced afterward as an optional bit of fun, never required.
 *
 * Votes stay sealed pre-reveal exactly like everywhere else (RLS on `votes`:
 * yours always, everyone's once `show_votes` flips). So the live bar chart
 * genuinely only exists post-reveal — pre-reveal there's nothing to chart.
 */

const QUESTION_IDS = ["most_likely_prompt"];

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

function BarChart({ idx }: { idx: number }) {
  const { roster } = usePlayer();
  const { votes } = useRoom();

  const roundVotes = useMemo(
    () => votes.filter((v) => v.idx === idx),
    [votes, idx],
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of roundVotes) m.set(v.value, (m.get(v.value) ?? 0) + 1);
    return m;
  }, [roundVotes]);

  const max = Math.max(1, ...Array.from(counts.values()));

  const ranked = [...roster].sort(
    (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
  );

  return (
    <div className="rise space-y-2">
      {ranked.map((p) => {
        const count = counts.get(p.id) ?? 0;
        const isTop = count > 0 && count === max;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-3"
          >
            <span className="text-xl">{p.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1">
                  {p.name}
                  {isTop && <span>👑</span>}
                </span>
                <span className="text-mute">{count}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(count / max) * 100}%`,
                    background: p.color,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Phone() {
  const { me, roster } = usePlayer();
  const { round, secrets, votes, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();

  if (!round || !item) {
    return (
      <GameShell icon="👀" title="Most Likely To">
        <WaitingOnHost label="Dealing prompts…" />
      </GameShell>
    );
  }

  const cursor = round.item_cursor;
  const isLast = cursor >= totalItems - 1;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";

  const myVote = votes.find((v) => v.player_id === me?.id && v.idx === cursor);
  const secret = secrets.find((s) => s.idx === cursor);
  const writer = revealed ? roster.find((p) => p.id === secret?.author) : undefined;

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_plurality", { p_round: round.id, p_idx: round.item_cursor });
  }

  async function next() {
    if (!round) return;
    if (isLast) {
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } else {
      await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
    }
  }

  return (
    <GameShell
      icon="👀"
      title="Most Likely To"
      subtitle={`Prompt ${cursor + 1} of ${totalItems}`}
      dock={
        isHost && !isDone ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={() => void reveal()}>Reveal</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void next()}>
                {isLast ? "Finish round" : "Next prompt →"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <ContentCard>{item.content}</ContentCard>

      <div className="mt-6">
        {!revealed ? (
          <>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
              Who&apos;s most likely?
            </p>
            <PersonVote idx={cursor} />
            {myVote && (
              <p className="mt-4 text-center text-xs text-mute">
                Locked in — the host reveals when everyone&apos;s voted.
              </p>
            )}
          </>
        ) : (
          <>
            <BarChart idx={cursor} />
            {writer && (
              <p className="mt-4 text-center text-xs text-mute">
                🖊️ written by {writer.emoji} {writer.name}
              </p>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
}

export const mostLikelyTo: GameModule = {
  id: "most_likely_to",
  title: "Most Likely To",
  hall: "huddle",
  icon: "👀",
  blurb: "Secret vote for a person. Live bar chart when the host reveals.",
  source: { kind: "survey", questionIds: QUESTION_IDS, items: 8 },
  minutes: 10,
  async start({ call }) {
    await call("start_round", {
      p_game: "most_likely_to",
      p_hall: "huddle",
      p_question_ids: QUESTION_IDS,
      p_items: 8,
    });
  },
  // Fake prompts — never reads survey_responses, see who-wrote-it's
  // startTest for why this exists as a separate path.
  async startTest({ call }) {
    const fakes = [
      "Most likely to (TEST DATA — not a real prompt) forget their own birthday",
      "Most likely to (TEST DATA — not a real prompt) win an argument with a vending machine",
    ];
    const roundId = (await call("start_round", {
      p_game: "most_likely_to",
      p_hall: "huddle",
      p_test: true,
    })) as string;
    for (let i = 0; i < fakes.length; i++) {
      await call("deal_test_pair", { p_round: roundId, p_idx: i, p_content: fakes[i] });
    }
  },
  PhoneView: Phone,
};
