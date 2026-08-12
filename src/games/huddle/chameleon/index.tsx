"use client";

import { useMemo } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { PersonVote } from "@/components/play/PersonVote";
import { CHAMELEON_GRIDS } from "@/config/decks";

/**
 * THE CHAMELEON — a 4x4 grid everyone can see; everyone but the chameleon
 * knows the secret word. Say one word about it — too obvious and the
 * chameleon guesses, too vague and the room votes for you.
 *
 * The grid itself is public (`deal_deck`, kind 'deck', idx 0). Which single
 * word is "it" is dealt the same way Spyfall deals its spy card
 * (`deal_roles`, kind 'role', idx 0) — Postgres, not the host's device,
 * picks the chameleon, so the host can play too. Both rows share idx 0 but
 * differ in `kind`, so they coexist without clashing.
 */

const CHAMELEON_CARD = "You don't know the word. Bluff.";

function Grid({ words, topic }: { words: string[]; topic?: string }) {
  return (
    <div className="rise">
      {topic && (
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-mute">
          Topic: {topic}
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {words.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-line bg-ink-2 px-1 text-center text-[11px] font-semibold leading-tight"
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleCard({
  knowsWord,
  content,
}: {
  knowsWord: boolean;
  content: string;
}) {
  return (
    <div
      className={`rise mt-4 rounded-3xl border p-5 text-center ${
        knowsWord ? "border-line bg-ink-2" : "border-flame bg-flame/10"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${
          knowsWord ? "text-mute" : "text-flame"
        }`}
      >
        {knowsWord ? "Your word" : "You're the chameleon"}
      </p>
      <p className="mt-2 text-lg font-black leading-snug">{content}</p>
    </div>
  );
}

function RevealPanel({ idx }: { idx: number }) {
  const { roster } = usePlayer();
  const { votes, secrets } = useRoom();
  const secret = secrets.find((s) => s.idx === idx);
  const chameleon = roster.find((p) => p.id === secret?.author);
  const word = (secret?.payload as { shared?: string } | undefined)?.shared;
  const roundVotes = votes.filter((v) => v.idx === idx);
  const caught = roundVotes.filter((v) => v.value === secret?.author).length;
  const survived = secret?.author ? caught * 2 <= roundVotes.length : false;

  return (
    <div className="rise space-y-4 text-center">
      {chameleon ? (
        <div
          className="inline-flex flex-col items-center gap-2 rounded-3xl border px-6 py-5"
          style={{ borderColor: chameleon.color, background: `${chameleon.color}18` }}
        >
          <span className="text-3xl">{chameleon.emoji}</span>
          <span className="text-xl font-black">{chameleon.name}</span>
          <span className="text-xs text-mute">was the chameleon</span>
        </div>
      ) : (
        <p className="text-mute">No chameleon was dealt.</p>
      )}
      {word && (
        <p className="text-sm text-mute">
          The word was <span className="font-semibold text-paper">{word}</span>
        </p>
      )}
      <p className="text-sm text-mute">
        {caught} of {roundVotes.length} correctly voted the chameleon —{" "}
        {survived
          ? `${chameleon?.name ?? "the chameleon"} survived and earns +250`
          : "the room caught them"}
      </p>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, isHost, call } = useRoom();
  const roundItems = useCurrentItems();
  const deckItem = roundItems.find((i) => i.kind === "deck");
  const roleItem = roundItems.find((i) => i.kind === "role");

  const words = useMemo(() => {
    if (!deckItem) return [];
    try {
      const parsed = JSON.parse(deckItem.content) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [deckItem]);

  if (!round || !deckItem || !roleItem) {
    return (
      <GameShell icon="🦎" title="The Chameleon">
        <WaitingOnHost label="Dealing the grid…" />
      </GameShell>
    );
  }

  const topic = typeof deckItem.meta?.topic === "string" ? (deckItem.meta.topic as string) : undefined;
  const knowsWord = words.includes(roleItem.content);
  const voting = round.phase === "vote";
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";

  async function toVote() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "vote" });
  }

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_odd_one_out", { p_round: round.id });
  }

  async function finish() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  return (
    <GameShell
      icon="🦎"
      title="The Chameleon"
      subtitle={
        revealed ? "Revealed" : voting ? "Vote for the chameleon" : "Say one word each"
      }
      dock={
        isHost && !isDone ? (
          <div className="flex gap-2 pt-3">
            {!voting && !revealed && (
              <PrimaryButton onClick={() => void toVote()}>Time to vote</PrimaryButton>
            )}
            {voting && (
              <PrimaryButton onClick={() => void reveal()}>Reveal</PrimaryButton>
            )}
            {revealed && (
              <PrimaryButton onClick={() => void finish()}>Finish round</PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <Grid words={words} topic={topic} />

      {!voting && !revealed && (
        <>
          <RoleCard knowsWord={knowsWord} content={roleItem.content} />
          <p className="mt-4 text-center text-sm text-mute">
            Go round and each say one word about it. When you&apos;re ready, vote for
            the chameleon.
          </p>
        </>
      )}

      {voting && (
        <div className="mt-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
            Who&apos;s the chameleon?
          </p>
          <PersonVote idx={0} exclude={me ? [me.id] : []} />
        </div>
      )}

      {revealed && (
        <div className="mt-6">
          <RevealPanel idx={0} />
        </div>
      )}
    </GameShell>
  );
}

export const chameleon: GameModule = {
  id: "chameleon",
  title: "The Chameleon",
  hall: "huddle",
  icon: "🦎",
  blurb: "Everyone knows the word except one bluffer. Vote them out.",
  source: { kind: "roles" },
  minutes: 10,
  async start({ call }) {
    const grid = CHAMELEON_GRIDS[Math.floor(Math.random() * CHAMELEON_GRIDS.length)];
    const secretWord = grid.words[Math.floor(Math.random() * grid.words.length)];

    const roundId = (await call("start_deck_round", {
      p_game: "chameleon",
      p_hall: "huddle",
    })) as string;

    await call("deal_deck", {
      p_round: roundId,
      p_items: [{ content: JSON.stringify(grid.words), meta: { topic: grid.topic } }],
    });

    await call("deal_roles", {
      p_round: roundId,
      p_shared_content: secretWord,
      p_odd_content: CHAMELEON_CARD,
      p_odd_count: 1,
    });
  },
  PhoneView: Phone,
};
