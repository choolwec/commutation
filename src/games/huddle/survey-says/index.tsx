"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import {
  ContentCard,
  GameShell,
  PrimaryButton,
  WaitingOnHost,
} from "@/components/play/GameShell";
import { useSeats, useTotalItems, pickN } from "@/games/common";
import { SURVEY_SAYS_PROMPTS } from "@/config/their-rounds";

/**
 * SURVEY SAYS — the six-person shape of Family Feud (THEIR_ROUNDS §1.3).
 *
 * The submitted idea was "survey says", and the resolution in the spec is
 * the interesting part: a real Feud board needs a hundred pre-ranked
 * answers, which six people cannot supply. So the scoring inverts. There is
 * no board and no right answer — you score by how many OTHER PEOPLE IN THIS
 * ROOM wrote the same thing you did.
 *
 * That flips how you play it, which is the whole appeal: the funny answer
 * and the winning answer are now different answers, and knowing the room
 * well enough to be boring on purpose is a real skill.
 *
 * score_agreement (0015) does the grouping server-side off
 * normalise_answer, so "the pizzas" and "Pizza" land together. It pays
 * 100 × (group size − 1): matching one person pays 100 each, matching two
 * pays 200 each, and being the only one who said it pays nothing at all.
 *
 * The near-miss the machine can't catch ("minibus" vs "bus fare") is a host
 * tap on the reveal, falling back to award_points — exactly the manual
 * merge §1.3 asked for.
 *
 * VISUAL IDENTITY: the board. Deep game-show blue, answers flipping up as
 * stacked panels sized by how many people said them, biggest at the top.
 */

const ACCENT = "#3b82f6";
const PROMPTS = 5;
const PER_MATCH = 100;

/** Mirrors normalise_answer() in 0015 closely enough to group the reveal the
 *  same way the server just scored it. The server's version is the one that
 *  pays out — this only decides which panel a card is drawn in. */
function groupKey(v: string): string {
  const base = v
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
  return base.length > 3 && base.endsWith("s") && !base.endsWith("ss")
    ? base.slice(0, -1)
    : base;
}

function AnswerBox({ idx }: { idx: number }) {
  const { round, submissions, call } = useRoom();
  const { me } = usePlayer();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = submissions.find(
    (s) => s.idx === idx && s.player_id === me?.id && s.kind === "answer",
  );

  async function send() {
    if (!round || !text.trim() || busy) return;
    setBusy(true);
    try {
      await call("submit_answer", {
        p_round: round.id,
        p_idx: idx,
        p_kind: "answer",
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
        placeholder={mine ? "change it…" : "keep it short — one or two words"}
        className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-4 text-center text-lg font-bold outline-none focus:border-[color:var(--acc)]"
        style={{ ["--acc" as string]: ACCENT }}
      />
      <PrimaryButton
        onClick={() => void send()}
        disabled={!text.trim() || busy}
        style={{ background: ACCENT, color: "white" }}
      >
        {mine ? "Change it" : "Lock it in"}
      </PrimaryButton>
      <p className="text-center text-xs text-mute">
        {mine ? (
          <>
            In: <span className="font-bold text-paper">{mine.value}</span> — don&apos;t be
            clever, be predictable.
          </>
        ) : (
          "You score for every other person who writes the same thing."
        )}
      </p>
    </div>
  );
}

type Panel = { key: string; label: string; players: string[] };

function Board({ idx, onMerge }: { idx: number; onMerge?: (id: string) => void }) {
  const { submissions } = useRoom();
  const seats = useSeats();

  const panels = useMemo(() => {
    const map = new Map<string, Panel>();
    for (const s of submissions.filter((x) => x.idx === idx && x.kind === "answer")) {
      const key = groupKey(s.value);
      const found = map.get(key);
      if (found) found.players.push(s.player_id ?? "");
      else map.set(key, { key, label: s.value.trim(), players: [s.player_id ?? ""] });
    }
    return [...map.values()].sort((a, b) => b.players.length - a.players.length);
  }, [submissions, idx]);

  const top = Math.max(1, panels[0]?.players.length ?? 1);

  return (
    <div className="rise mt-6 space-y-2">
      {panels.map((p) => {
        const n = p.players.length;
        const scoring = n > 1;
        return (
          <div
            key={p.key}
            className="overflow-hidden rounded-2xl border"
            style={{
              borderColor: scoring
                ? `color-mix(in oklab, ${ACCENT} 60%, var(--color-line))`
                : "var(--color-line)",
              background: scoring
                ? `linear-gradient(90deg, color-mix(in oklab, ${ACCENT} 26%, var(--color-ink-2)) ${(n / top) * 100}%, var(--color-ink-2) ${(n / top) * 100}%)`
                : "var(--color-ink-2)",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm font-black uppercase tracking-wide">
                {p.label}
              </span>
              <span className="flex -space-x-1.5">
                {p.players.map((id) => (
                  <span key={id} className="text-base">
                    {seats.find((s) => s.id === id)?.emoji ?? "👤"}
                  </span>
                ))}
              </span>
              <span
                className="w-12 shrink-0 text-right text-sm font-black tabular-nums"
                style={{ color: scoring ? ACCENT : "var(--color-mute)" }}
              >
                {scoring ? `+${(n - 1) * PER_MATCH}` : "—"}
              </span>
            </div>
            {onMerge && !scoring && (
              <button
                type="button"
                onClick={() => onMerge(p.players[0])}
                className="w-full border-t border-line px-4 py-1.5 text-left text-[11px] font-bold text-mute active:bg-ink-3"
              >
                close enough — pay them {PER_MATCH} anyway
              </button>
            )}
          </div>
        );
      })}
      {panels.length === 0 && (
        <p className="text-center text-xs text-mute">Nobody answered this one.</p>
      )}
    </div>
  );
}

function Phone() {
  const { round, isHost, call } = useRoom();
  const total = useTotalItems();
  const item = useCurrentItems().find((i) => i.kind === "deck");
  const [merged, setMerged] = useState<string[]>([]);

  if (!round || !item) {
    return (
      <GameShell icon="📋" title="Survey Says">
        <WaitingOnHost label="Bringing up the board…" />
      </GameShell>
    );
  }

  const cursor = round.item_cursor;
  const isLast = cursor >= total - 1;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_agreement", {
      p_round: round.id,
      p_idx: round.item_cursor,
      p_points: PER_MATCH,
    });
  }

  async function next() {
    if (!round) return;
    setMerged([]);
    if (isLast) await call("set_phase", { p_round: round.id, p_phase: "done" });
    else await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
  }

  // The manual merge §1.3 asked for: the machine groups on spelling, and a
  // room knows "minibus" and "bus" were the same answer. Falls back to
  // award_points rather than trying to teach score_agreement synonyms.
  async function merge(playerId: string) {
    if (!round || !playerId || merged.includes(playerId)) return;
    setMerged((m) => [...m, playerId]);
    await call("award_points", {
      p_player: playerId,
      p_points: PER_MATCH,
      p_reason: "survey_says_merge",
      p_round: round.id,
    });
  }

  return (
    <GameShell
      icon="📋"
      title="Survey Says"
      subtitle={`Prompt ${cursor + 1} of ${total}`}
      dock={
        isHost && !isDone ? (
          <div className="pt-3">
            <PrimaryButton
              onClick={() => void (revealed ? next() : reveal())}
              style={{ background: ACCENT, color: "white" }}
            >
              {revealed ? (isLast ? "Finish round" : "Next prompt →") : "Show the board"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}, transparent 60%)`,
          opacity: 0.14,
        }}
      />

      <ContentCard>{item.content}</ContentCard>

      {!revealed ? (
        <AnswerBox idx={cursor} />
      ) : (
        <>
          <Board idx={cursor} onMerge={isHost ? merge : undefined} />
          <p className="mt-4 text-center text-xs text-mute">
            100 for every other person who said the same thing. Original thinking pays
            nothing here.
          </p>
        </>
      )}
    </GameShell>
  );
}

export const surveySays: GameModule = {
  id: "survey_says",
  title: "Survey Says",
  hall: "huddle",
  icon: "📋",
  blurb: "Guess what the room will say, not what's true. Matching is the point.",
  source: { kind: "deck" },
  origin: "group",
  minutes: 12,
  async start({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "survey_says",
      p_hall: "huddle",
    })) as string;

    const dealt = (await call("deal_deck", {
      p_round: roundId,
      p_items: pickN(SURVEY_SAYS_PROMPTS, PROMPTS).map((content) => ({ content })),
    })) as number;

    if (!dealt) throw new Error("nothing to deal");
    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
