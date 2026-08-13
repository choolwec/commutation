"use client";

import { useMemo, useState } from "react";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import {
  GameShell,
  PrimaryButton,
  WaitingOnHost,
} from "@/components/play/GameShell";
import { SubmissionVote } from "@/components/play/SubmissionVote";
import { FIBBAGE_FACTS } from "@/config/decks";

/**
 * FIBBAGE — gold, game-show, a spotlight on the blank.
 *
 * The true answer never sits in round_items: it's planted as a phantom
 * submission with no author (seed_truth_submission, migration 0008),
 * indistinguishable from real lies until the reveal opens round_secrets.
 * This is the one deck game in the app where the answer is actually sealed
 * server-side rather than trusted to the honor system — worth it here
 * because the whole game is "spot the real one among these," and if the
 * answer were sitting in the page source the game would just be broken.
 */

const GLOW = "#ffc247"; // --color-gold

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

function Phone() {
  const { round, submissions, votes, secrets, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const total = useTotalItems();
  const cursor = round?.item_cursor ?? 0;

  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [scored, setScored] = useState(false);

  const revealed = round?.phase === "reveal" || round?.phase === "done";
  const secret = secrets.find((s) => s.idx === cursor);
  const truthId = secret?.payload?.truth_submission as string | undefined;
  const isLast = round ? cursor >= total - 1 : false;

  async function sendLie() {
    if (!round || !draft.trim()) return;
    await call("submit_answer", {
      p_round: round.id,
      p_idx: cursor,
      p_kind: "lie",
      p_value: draft.trim(),
    });
    setSent(true);
  }

  async function openVoting() {
    if (!round) return;
    await call("set_reveal", { p_round: round.id, p_submissions: true, p_votes: false });
    await call("set_phase", { p_round: round.id, p_phase: "vote" });
  }

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function score() {
    if (!round || !truthId || scored) return;
    setScored(true);
    const here = submissions.filter((s) => s.idx === cursor);
    const votesHere = votes.filter((v) => v.idx === cursor);
    for (const v of votesHere) {
      if (v.value === truthId) {
        await call("award_points", {
          p_player: v.player_id,
          p_points: 100,
          p_reason: "fibbage_truth",
          p_round: round.id,
        });
      } else {
        const author = here.find((s) => s.id === v.value)?.player_id;
        if (author) {
          await call("award_points", {
            p_player: author,
            p_points: 50,
            p_reason: "fibbage_fooled",
            p_round: round.id,
          });
        }
      }
    }
  }

  async function next() {
    if (!round) return;
    setDraft("");
    setSent(false);
    setScored(false);
    if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
    else await call("set_cursor", { p_round: round.id, p_cursor: cursor + 1 });
  }

  if (!round || !item) {
    return (
      <GameShell icon="🎤" title="Fibbage">
        <WaitingOnHost label="Dealing prompts…" />
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="🎤"
      title="Fibbage"
      subtitle={`Fact ${cursor + 1} of ${total}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            {round.phase === "play" && (
              <PrimaryButton style={{ background: GLOW }} onClick={openVoting}>
                Everyone&apos;s in → vote
              </PrimaryButton>
            )}
            {round.phase === "vote" && (
              <PrimaryButton style={{ background: GLOW }} onClick={reveal}>
                Reveal the truth
              </PrimaryButton>
            )}
            {revealed && (
              <PrimaryButton style={{ background: GLOW }} onClick={() => (scored ? next() : score())}>
                {scored ? (isLast ? "Finish round" : "Next fact →") : "Score this round"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <div
        className="rise rounded-3xl border border-line p-6 text-center text-lg font-bold leading-snug"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${GLOW}14, transparent 70%)`,
        }}
      >
        {item.content}
      </div>

      <div className="mt-6">
        {round.phase === "play" && !sent && (
          <div className="space-y-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Fill the blank with a convincing lie…"
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none focus:border-flame/60"
            />
            <PrimaryButton style={{ background: GLOW }} onClick={sendLie} disabled={!draft.trim()}>
              Lock it in
            </PrimaryButton>
          </div>
        )}
        {round.phase === "play" && sent && (
          <p className="text-center text-sm text-mute">Locked in — waiting on the room.</p>
        )}
        {round.phase === "vote" && <SubmissionVote idx={cursor} />}
        {revealed && (
          <div className="rise space-y-2">
            {submissions
              .filter((s) => s.idx === cursor)
              .map((s) => (
                <div
                  key={s.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    s.id === truthId
                      ? "border-emerald-400/60 bg-emerald-400/10 font-bold text-emerald-200"
                      : "border-line bg-ink-2"
                  }`}
                >
                  {s.value}
                  {s.id === truthId && <span className="ml-2 text-xs uppercase">✓ truth</span>}
                </div>
              ))}
          </div>
        )}
      </div>
    </GameShell>
  );
}

export const fibbage: GameModule = {
  id: "fibbage",
  title: "Fibbage",
  hall: "arena",
  icon: "🎤",
  blurb: "A wild true fact with a blank. Lie convincingly, spot the truth.",
  source: { kind: "deck" },
  requiresTv: false,
  minutes: 12,
  async start({ call }) {
    const picked = shuffle(FIBBAGE_FACTS).slice(0, 6);
    const roundId = await call("start_deck_round", { p_game: "fibbage", p_hall: "arena" });
    await call("deal_deck", {
      p_round: roundId,
      p_items: picked.map((f) => ({ content: f.prompt })),
    });
    for (let i = 0; i < picked.length; i++) {
      await call("seed_truth_submission", {
        p_round: roundId,
        p_idx: i,
        p_value: picked[i].answer,
      });
    }
  },
  PhoneView: Phone,
};
