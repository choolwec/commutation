"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { DRAWFUL_PROMPTS } from "@/config/decks";
import { Canvas } from "./Canvas";
import { DrawfulTv } from "./TvView";

/**
 * DRAWFUL — orange, crayon energy, a real canvas. The reason it's tier-1
 * despite needing one: it's the game that justifies the TV, and this canvas
 * is single-player (draw alone, guess together) — far simpler than a
 * shared multi-hand canvas like Fake Artist, which is why that one didn't
 * make the cut and this one did.
 *
 * Structurally identical to Fibbage under the hood: the real prompt is
 * seeded as a phantom submission (seed_truth_submission, kind 'lie' — the
 * kind string is just a shared tag between the two games, not literal),
 * indistinguishable from everyone else's fake titles until the reveal.
 */

const GLOW = "#f97316";

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
  const { round, submissions, votes, secrets, isHost, call } = useRoom();
  const promptItem = useCurrentItems().find((i) => i.kind === "role");
  const total = useTotalItems();
  const cursor = round?.item_cursor ?? 0;

  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [scored, setScored] = useState(false);

  const revealed = round?.phase === "reveal" || round?.phase === "done";
  const isLast = round ? cursor >= total - 1 : false;
  const iAmArtist = Boolean(promptItem); // RLS already scoped this item to me alone
  const drawing = submissions.find((s) => s.idx === cursor && s.kind === "drawing");
  const secret = secrets.find((s) => s.idx === cursor);
  const truthId = secret?.payload?.truth_submission as string | undefined;

  async function submitDrawing(dataUrl: string) {
    if (!round) return;
    await call("submit_answer", {
      p_round: round.id,
      p_idx: cursor,
      p_kind: "drawing",
      p_value: dataUrl,
    });
  }
  async function sendTitle() {
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
    if (!round || !truthId || scored || !drawing) return;
    setScored(true);
    const titles = submissions.filter((s) => s.idx === cursor && s.kind === "lie");
    const votesHere = votes.filter((v) => v.idx === cursor);
    let fooled = 0;
    for (const v of votesHere) {
      if (v.value === truthId) {
        fooled += 0;
        await call("award_points", {
          p_player: v.player_id,
          p_points: 100,
          p_reason: "drawful_truth",
          p_round: round.id,
        });
      } else {
        fooled += 1;
        const author = titles.find((s) => s.id === v.value)?.player_id;
        if (author) {
          await call("award_points", {
            p_player: author,
            p_points: 50,
            p_reason: "drawful_fooled",
            p_round: round.id,
          });
        }
      }
    }
    if (fooled > 0 && drawing.player_id) {
      await call("award_points", {
        p_player: drawing.player_id,
        p_points: fooled * 50,
        p_reason: "drawful_artist",
        p_round: round.id,
      });
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

  if (!round) {
    return (
      <GameShell icon="🖍️" title="Drawful">
        <WaitingOnHost label="Dealing turns…" />
      </GameShell>
    );
  }

  const artist = roster.find((p) => p.id === drawing?.player_id);

  return (
    <GameShell
      icon="🖍️"
      title="Drawful"
      subtitle={`Turn ${cursor + 1} of ${total}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            {round.phase === "play" && drawing && (
              <PrimaryButton style={{ background: GLOW }} onClick={openVoting}>
                Drawing&apos;s in → everyone titles it
              </PrimaryButton>
            )}
            {round.phase === "vote" && (
              <PrimaryButton style={{ background: GLOW }} onClick={reveal}>
                Reveal
              </PrimaryButton>
            )}
            {revealed && (
              <PrimaryButton style={{ background: GLOW }} onClick={() => (scored ? next() : score())}>
                {scored ? (isLast ? "Finish round" : "Next turn →") : "Score this round"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      {round.phase === "play" && iAmArtist && !drawing && (
        <div>
          <p className="mb-3 text-center text-lg font-bold">{promptItem?.content}</p>
          <Canvas onDone={submitDrawing} />
        </div>
      )}
      {round.phase === "play" && iAmArtist && drawing && (
        <p className="rise text-center text-sm text-mute">
          Submitted — waiting for everyone else to see it.
        </p>
      )}
      {round.phase === "play" && !iAmArtist && (
        <WaitingOnHost label="Someone's drawing something ridiculous right now." />
      )}

      {(round.phase === "vote" || revealed) && drawing && (
        <img
          src={drawing.value}
          alt="the drawing"
          className="rise mx-auto w-full max-w-xs rounded-2xl border-2"
          style={{ borderColor: GLOW }}
        />
      )}

      {round.phase === "vote" && !iAmArtist && (
        <div className="mt-4 space-y-2">
          {!sent ? (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What is this supposed to be?"
                className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none focus:border-flame/60"
              />
              <PrimaryButton style={{ background: GLOW }} onClick={sendTitle} disabled={!draft.trim()}>
                Lock it in
              </PrimaryButton>
            </>
          ) : (
            <p className="text-center text-sm text-mute">Locked in — waiting on the room.</p>
          )}
        </div>
      )}
      {round.phase === "vote" && iAmArtist && (
        <p className="mt-4 text-center text-sm text-mute">
          Everyone else is titling your masterpiece.
        </p>
      )}

      {revealed && (
        <div className="rise mt-4 space-y-2">
          {submissions
            .filter((s) => s.idx === cursor && s.kind === "lie")
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
                {s.id === truthId && <span className="ml-2 text-xs uppercase">✓ the real prompt</span>}
              </div>
            ))}
          <p className="pt-1 text-center text-xs text-mute">
            drawn by {artist?.name ?? "someone"}
          </p>
        </div>
      )}
    </GameShell>
  );
}

export const drawful: GameModule = {
  id: "drawful",
  title: "Drawful",
  hall: "arena",
  icon: "🖍️",
  blurb: "Draw the prompt on your phone. Everyone titles it. Spot the real one.",
  source: { kind: "deck" },
  requiresTv: true,
  minutes: 15,
  async start({ call, roster }) {
    const claimed = roster.filter((p) => p.claimed_by);
    if (claimed.length === 0) throw new Error("nobody has claimed a profile yet");

    const roundId = await call("start_deck_round", { p_game: "drawful", p_hall: "arena" });
    const prompts = shuffle(DRAWFUL_PROMPTS).slice(0, claimed.length);

    for (let i = 0; i < claimed.length; i++) {
      await call("deal_private", {
        p_round: roundId,
        p_idx: i,
        p_to: claimed[i].id,
        p_content: prompts[i],
      });
      await call("seed_truth_submission", {
        p_round: roundId,
        p_idx: i,
        p_value: prompts[i],
      });
    }
  },
  PhoneView: Phone,
  TvView: DrawfulTv,
};
