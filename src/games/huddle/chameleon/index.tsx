"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { PersonVote } from "@/components/play/PersonVote";
import { RoundTimer } from "@/components/play/RoundTimer";
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
 *
 * Two additions on top of the base mechanic (P2 polish, not just copy):
 * a shared countdown for the "say one word" phase so it can't stall out
 * forever, and — straight from the real board game — a caught chameleon
 * gets one guess at the secret word for partial credit (award_chameleon_
 * guess, migration 0014) rather than just losing outright.
 */

const CHAMELEON_CARD = "You don't know the word. Bluff.";
const WORD_PHASE_SECONDS = 90;

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

function ChameleonGuessBox({
  round,
  onResolved,
}: {
  round: { id: string };
  onResolved: (result: "correct" | "wrong") => void;
}) {
  const { call } = useRoom();
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!guess.trim() || busy) return;
    setBusy(true);
    try {
      const correct = await call("award_chameleon_guess", {
        p_round: round.id,
        p_guess: guess.trim(),
      });
      const outcome = correct ? "correct" : "wrong";
      setResult(outcome);
      onResolved(outcome);
    } catch {
      setResult("wrong");
      onResolved("wrong");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <p className={`text-sm font-bold ${result === "correct" ? "text-flame" : "text-mute"}`}>
        {result === "correct" ? "Nailed it — +100 for the read." : "Not quite — no points, nice try."}
      </p>
    );
  }

  return (
    <div className="rise space-y-3 rounded-3xl border border-flame/40 bg-flame/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-flame">
        Caught — one guess at the word for partial credit
      </p>
      <input
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="What was the word?"
        className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-center text-base outline-none focus:border-flame/60"
      />
      <PrimaryButton onClick={() => void submit()} disabled={!guess.trim() || busy}>
        {busy ? "Checking…" : "Lock in guess"}
      </PrimaryButton>
    </div>
  );
}

function RevealPanel({ idx, round }: { idx: number; round: { id: string } }) {
  const { me, roster } = usePlayer();
  const { votes, secrets } = useRoom();
  const secret = secrets.find((s) => s.idx === idx);
  const chameleon = roster.find((p) => p.id === secret?.author);
  const word = (secret?.payload as { shared?: string } | undefined)?.shared;
  const roundVotes = votes.filter((v) => v.idx === idx);
  const caught = roundVotes.filter((v) => v.value === secret?.author).length;
  const survived = secret?.author ? caught * 2 <= roundVotes.length : false;
  const iAmChameleon = Boolean(me && secret?.author === me.id);

  // The word is already in this phone's memory the instant reveal opens —
  // round_secrets RLS keys off round.phase, not who's asking — so this gate
  // is honor-system UI sequencing, not real secrecy. Same trust level
  // already accepted for Fibbage/Trivia's answer keys (see 0014's header).
  const [wordUnlocked, setWordUnlocked] = useState(false);
  const showWord = !iAmChameleon || survived || wordUnlocked;

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

      {iAmChameleon && !survived && (
        <ChameleonGuessBox round={round} onResolved={() => setWordUnlocked(true)} />
      )}
      {iAmChameleon && !survived && !showWord && (
        <button
          type="button"
          onClick={() => setWordUnlocked(true)}
          className="text-xs text-mute underline underline-offset-4"
        >
          Skip — just show me the word
        </button>
      )}

      {showWord && word && (
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
          <RoundTimer
            seconds={WORD_PHASE_SECONDS}
            onExpire={() => void toVote()}
            className="mb-3 block text-center text-3xl"
          />
          <RoleCard knowsWord={knowsWord} content={roleItem.content} />
          <p className="mt-4 text-center text-sm text-mute">
            Go round and say ONE word each about it — no repeats. Too obvious
            (basically naming it) and the chameleon bluffs right back at you;
            too vague (something that fits half the grid) and the room stops
            trusting your word either.
          </p>
          <p className="mt-2 text-center text-xs text-mute/70">
            Example: secret word &quot;Pizza&quot; on a foods grid —
            &quot;cheesy&quot; is sharp but safe, &quot;food&quot; is too
            vague, &quot;pepperoni&quot; might give it away outright.
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
          <RevealPanel idx={0} round={round} />
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

    // rounds.phase already defaults to 'play' (migration 0010), but
    // started_at only gets set by set_phase/set_cursor — never on insert.
    // Without this, RoundTimer's countdown has no reference point until
    // *something* else calls set_phase, which nothing does before "vote."
    await call("set_phase", { p_round: roundId, p_phase: "play" });
  },
  PhoneView: Phone,
};
