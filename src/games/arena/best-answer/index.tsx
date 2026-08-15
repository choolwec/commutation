"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule, GameViewProps } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { SubmissionVote } from "@/components/play/SubmissionVote";
import { TvShell } from "@/components/play/TvShell";
import { BEST_ANSWER_PROMPTS } from "@/config/decks";

/**
 * BEST ANSWER — hot pink, roast-battle energy. Quiplash-style: everyone
 * writes, then votes for the funniest, funded first by whatever the group
 * wrote in survey section 6 (`quiplash`), padded by the deck reserve.
 */

const GLOW = "#ec4899";

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
  const { roster } = usePlayer();
  const { round, submissions, votes, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const total = useTotalItems();
  const cursor = round?.item_cursor ?? 0;

  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [scored, setScored] = useState(false);

  const revealed = round?.phase === "reveal" || round?.phase === "done";
  const isLast = round ? cursor >= total - 1 : false;

  async function sendAnswer() {
    if (!round || !draft.trim()) return;
    await call("submit_answer", {
      p_round: round.id,
      p_idx: cursor,
      p_kind: "answer",
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
    if (!round || scored) return;
    setScored(true);
    const here = submissions.filter((s) => s.idx === cursor);
    const tally = new Map<string, number>();
    for (const v of votes.filter((v) => v.idx === cursor)) {
      tally.set(v.value, (tally.get(v.value) ?? 0) + 1);
    }
    const winnerEntry = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (winnerEntry) {
      const author = here.find((s) => s.id === winnerEntry[0])?.player_id;
      if (author) {
        await call("award_points", {
          p_player: author,
          p_points: 50 * winnerEntry[1],
          p_reason: "best_answer",
          p_round: round.id,
        });
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
      <GameShell icon="⚡" title="Best Answer">
        <WaitingOnHost label="Dealing prompts…" />
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="⚡"
      title="Best Answer"
      subtitle={`Prompt ${cursor + 1} of ${total}`}
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
                Reveal votes
              </PrimaryButton>
            )}
            {revealed && (
              <PrimaryButton style={{ background: GLOW }} onClick={() => (scored ? next() : score())}>
                {scored ? (isLast ? "Finish round" : "Next prompt →") : "Crown the winner"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <div
        className="rise rounded-3xl border p-6 text-center text-lg font-bold leading-snug"
        style={{ borderColor: `${GLOW}55`, background: `${GLOW}12` }}
      >
        {item.content}
      </div>

      <div className="mt-6">
        {round.phase === "play" && !sent && (
          <div className="space-y-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Funniest thing you've got…"
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none focus:border-flame/60"
            />
            <PrimaryButton style={{ background: GLOW }} onClick={sendAnswer} disabled={!draft.trim()}>
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
              .map((s) => {
                const n = votes.filter((v) => v.idx === cursor && v.value === s.id).length;
                const author = roster.find((p) => p.id === s.player_id);
                return (
                  <div key={s.id} className="rounded-2xl border border-line bg-ink-2 px-4 py-3">
                    <p className="text-sm font-semibold">{s.value}</p>
                    <p className="mt-1 text-xs text-mute">
                      {author?.name ?? "someone"} · {n} vote{n === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </GameShell>
  );
}

/**
 * TV: the prompt, the answers, then the votes landing on them.
 *
 * This is the most TV-shaped game in the app and had no board at all —
 * everyone was reading five answers off their own 6-inch screen while
 * sitting in the same room. Now the answers go up big during voting
 * (authors hidden, exactly as the phones have them), and at the reveal
 * each one grows a vote bar and the winner gets crowned.
 *
 * The phases it reads are the phones' own: `submissions` only becomes
 * visible to anyone once the host flips show_submissions (set_reveal),
 * so there's no window where this screen could out-run the room.
 */
function Tv({ round }: GameViewProps) {
  const { roster } = usePlayer();
  const { items, submissions, votes } = useRoom();
  const cursor = round.item_cursor;
  const item = items.find((i) => i.idx === cursor && i.visible_to === null);
  const total = useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);

  const revealed = round.phase === "reveal" || round.phase === "done";
  const here = submissions.filter((s) => s.idx === cursor);
  const votesHere = votes.filter((v) => v.idx === cursor);
  const countFor = (id: string) => votesHere.filter((v) => v.value === id).length;
  const most = Math.max(0, ...here.map((s) => countFor(s.id)));

  if (!item) {
    return (
      <TvShell icon="⚡" title="Best Answer" accent={GLOW} gameId="best_answer">
        <p className="text-3xl font-bold text-mute">Dealing prompts…</p>
      </TvShell>
    );
  }

  return (
    <TvShell
      icon="⚡"
      title="Best Answer"
      accent={GLOW}
      gameId="best_answer"
      meta={`Prompt ${cursor + 1} of ${total}`}
    >
      <p className="rise max-w-4xl text-5xl font-black leading-tight">{item.content}</p>

      {round.phase === "play" && (
        // Not a progress counter: submissions are sealed to their author
        // until the host opens them (0005), and this screen holds no
        // profile at all, so any count here would sit at 0 all round.
        <p className="text-2xl font-bold text-mute">Writing on their phones…</p>
      )}

      {(round.phase === "vote" || revealed) && here.length > 0 && (
        <div className="rise flex w-full max-w-3xl flex-col gap-3">
          {here
            .slice()
            .sort((a, b) => (revealed ? countFor(b.id) - countFor(a.id) : 0))
            .map((s) => {
              const n = countFor(s.id);
              const winning = revealed && n > 0 && n === most;
              const author = roster.find((p) => p.id === s.player_id);
              return (
                <div
                  key={s.id}
                  className="overflow-hidden rounded-2xl border-2 transition-all duration-500"
                  style={{
                    borderColor: winning ? GLOW : "var(--color-line)",
                    background: revealed
                      ? `linear-gradient(90deg, color-mix(in oklab, ${GLOW} 24%, var(--color-ink-2)) ${most ? (n / most) * 100 : 0}%, var(--color-ink-2) ${most ? (n / most) * 100 : 0}%)`
                      : "var(--color-ink-2)",
                    boxShadow: winning
                      ? `0 0 40px color-mix(in oklab, ${GLOW} 35%, transparent)`
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-4 px-7 py-5 text-left">
                    <span className="flex-1 text-2xl font-bold">{s.value}</span>
                    {revealed && (
                      <>
                        <span className="text-lg text-mute">
                          {author?.emoji} {author?.name}
                        </span>
                        <span
                          className="w-16 shrink-0 text-right text-3xl font-black tabular-nums"
                          style={{ color: n > 0 ? GLOW : "var(--color-mute)" }}
                        >
                          {winning ? "👑" : n}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {round.phase === "vote" && (
        <p className="text-2xl font-bold text-mute">Vote for the best one.</p>
      )}
    </TvShell>
  );
}

export const bestAnswer: GameModule = {
  id: "best_answer",
  title: "Best Answer",
  hall: "arena",
  icon: "⚡",
  blurb: "One prompt, everyone answers, the room votes funniest.",
  source: { kind: "survey", questionIds: ["quiplash"], items: 5 },
  minutes: 12,
  async start({ call }) {
    // Their own prompts first (section 6, `quiplash`) via the sealed survey
    // path — same as who-wrote-it. start_round() throws if it deals zero,
    // which only happens if nobody answered that question yet; fall back to
    // the deck reserve so the game still runs.
    try {
      await call("start_round", {
        p_game: "best_answer",
        p_hall: "arena",
        p_question_ids: ["quiplash"],
        p_items: 5,
      });
      return;
    } catch {
      // fall through to the deck
    }
    const roundId = await call("start_deck_round", { p_game: "best_answer", p_hall: "arena" });
    const picked = shuffle(BEST_ANSWER_PROMPTS).slice(0, 5);
    await call("deal_deck", {
      p_round: roundId,
      p_items: picked.map((p) => ({ content: p })),
    });
  },
  // Deck-only, skipping the survey attempt entirely — real start() falls
  // back to the deck anyway if quiplash is empty, but testing shouldn't
  // even risk hitting the real content on a day it happens to be populated.
  async startTest({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "best_answer",
      p_hall: "arena",
      p_test: true,
    })) as string;
    const picked = shuffle(BEST_ANSWER_PROMPTS).slice(0, 5);
    await call("deal_deck", {
      p_round: roundId,
      p_items: picked.map((p) => ({ content: p })),
    });
  },
  PhoneView: Phone,
  TvView: Tv,
};
