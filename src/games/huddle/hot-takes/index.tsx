"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { ContentCard, GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { HOT_TAKE_SPECTRUMS } from "@/config/decks";

/**
 * HOT TAKES — one player secretly sees a target position on a spectrum
 * ("Overrated ↔ Underrated"), gives one verbal clue, everyone else drags a
 * dial to guess it. Scored by distance once the host reveals.
 *
 * The spectrum labels are public (`deal_deck`, kind 'deck') so every phone
 * can render the same dial ends. The target position is private to the
 * clue-giver (`deal_private`, kind 'private') and sealed into round_secrets
 * until reveal — nobody else's phone, including the host's, can compute
 * distances before that.
 */

type Spectrum = { low: string; high: string };
type ClueGiverPayload = Spectrum & { target: number };

function SpectrumBar({ low, high, position }: { low: string; high: string; position: number }) {
  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-3">
        <div
          className="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full bg-flame"
          style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-mute">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function GuessSlider({ low, high }: { low: string; high: string }) {
  const { me } = usePlayer();
  const { round, submissions, call } = useRoom();
  const mine = submissions.find(
    (s) => s.player_id === me?.id && s.idx === 0 && s.kind === "guess",
  );
  const [value, setValue] = useState<number>(mine ? Number(mine.value) : 50);

  async function commit(next: number) {
    if (!round) return;
    await call("submit_answer", {
      p_round: round.id,
      p_idx: 0,
      p_kind: "guess",
      p_value: String(next),
    });
  }

  return (
    <div className="space-y-3">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={() => void commit(value)}
        className="w-full accent-flame"
        aria-label={`Where between ${low} and ${high}?`}
      />
      <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-mute">
        <span>{low}</span>
        <span>{high}</span>
      </div>
      {mine && (
        <p className="text-center text-xs text-mute">
          Locked in at {mine.value} — drag again to change.
        </p>
      )}
    </div>
  );
}

function RevealPanel({ low, high }: Spectrum) {
  const { roster } = usePlayer();
  const { round, submissions, secrets, isHost, call } = useRoom();
  const [awarded, setAwarded] = useState<Set<string>>(new Set());

  const secret = secrets.find((s) => s.idx === 0);
  const target = Number((secret?.payload as { answer?: string } | undefined)?.answer ?? NaN);
  const clueGiverId = secret?.author ?? null;
  const clueGiver = roster.find((p) => p.id === clueGiverId);

  const ranked = useMemo(() => {
    return submissions
      .filter((s) => s.idx === 0 && s.kind === "guess" && s.player_id !== clueGiverId)
      .map((s) => ({ ...s, distance: Math.abs(Number(s.value) - target) }))
      .sort((a, b) => a.distance - b.distance);
  }, [submissions, clueGiverId, target]);

  const closest = ranked[0]?.distance;

  async function award(playerId: string, points: number) {
    if (!round) return;
    await call("award_points", {
      p_player: playerId,
      p_points: points,
      p_reason: "hot_takes",
      p_round: round.id,
    });
    setAwarded((prev) => new Set(prev).add(playerId));
  }

  return (
    <div className="rise space-y-5">
      {Number.isFinite(target) && (
        <div className="space-y-2">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-mute">
            The target was {target}
          </p>
          <SpectrumBar low={low} high={high} position={target} />
        </div>
      )}

      {clueGiver && (
        <p className="text-center text-xs text-mute">
          🎙️ {clueGiver.emoji} {clueGiver.name} gave the clue
        </p>
      )}

      <div className="space-y-2">
        {ranked.length === 0 ? (
          <p className="text-center text-sm text-mute">Nobody guessed.</p>
        ) : (
          ranked.map((g, i) => {
            const p = roster.find((r) => r.id === g.player_id);
            if (!p) return null;
            const isClosest = g.distance === closest;
            return (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-2xl border border-line bg-ink-2 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mute">#{i + 1}</span>
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-mute">
                    guessed {g.value} · off by {g.distance}
                  </span>
                  {isHost && isClosest && (
                    <button
                      type="button"
                      disabled={awarded.has(p.id)}
                      onClick={() => void award(p.id, 150)}
                      className="rounded-full bg-flame px-3 py-1 text-xs font-bold text-ink transition active:scale-95 disabled:opacity-40"
                    >
                      {awarded.has(p.id) ? "Awarded" : "+150"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Phone() {
  const { round, isHost, call } = useRoom();
  const roundItems = useCurrentItems();
  const privateItem = roundItems.find((i) => i.kind === "private");
  const deckItem = roundItems.find((i) => i.kind === "deck");

  if (!round || (!privateItem && !deckItem)) {
    return (
      <GameShell icon="🌡️" title="Hot Takes">
        <WaitingOnHost label="Setting the spectrum…" />
      </GameShell>
    );
  }

  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";
  const isClueGiver = Boolean(privateItem);

  let spectrum: Spectrum = { low: "", high: "" };
  let target: number | null = null;

  if (deckItem) {
    try {
      spectrum = JSON.parse(deckItem.content) as Spectrum;
    } catch {
      // leave defaults
    }
  }
  if (isClueGiver && privateItem) {
    try {
      const parsed = JSON.parse(privateItem.content) as ClueGiverPayload;
      spectrum = { low: parsed.low, high: parsed.high };
      target = parsed.target;
    } catch {
      // leave defaults
    }
  }

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function finish() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  return (
    <GameShell
      icon="🌡️"
      title="Hot Takes"
      subtitle={
        revealed ? "Revealed" : isClueGiver ? "Give one clue, out loud" : "Drag to guess"
      }
      dock={
        isHost && !isDone ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={() => void reveal()}>Reveal</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void finish()}>Finish round</PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      {revealed ? (
        <RevealPanel low={spectrum.low} high={spectrum.high} />
      ) : isClueGiver && target !== null ? (
        <div className="rise space-y-4">
          <div className="rounded-3xl border border-flame bg-flame/10 p-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-flame">
              Only you can see this
            </p>
            <p className="mt-2 text-sm text-mute">
              Give ONE verbal clue. Don&apos;t say the number.
            </p>
          </div>
          <SpectrumBar low={spectrum.low} high={spectrum.high} position={target} />
          <p className="text-center text-2xl font-black">
            {target}
            <span className="text-sm text-mute">/100</span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ContentCard>
            {spectrum.low} ↔ {spectrum.high}
          </ContentCard>
          <GuessSlider low={spectrum.low} high={spectrum.high} />
        </div>
      )}
    </GameShell>
  );
}

export const hotTakes: GameModule = {
  id: "hot_takes",
  title: "Hot Takes",
  hall: "huddle",
  icon: "🌡️",
  blurb: "One clue, one dial. Guess the secret spot on the spectrum.",
  source: { kind: "deck" },
  minutes: 8,
  async start({ call, roster }) {
    const spectrum =
      HOT_TAKE_SPECTRUMS[Math.floor(Math.random() * HOT_TAKE_SPECTRUMS.length)];
    const claimed = roster.filter((p) => p.claimed_by);
    if (claimed.length === 0) {
      throw new Error("nobody has claimed a profile yet");
    }
    const clueGiver = claimed[Math.floor(Math.random() * claimed.length)];
    const target = Math.floor(Math.random() * 101);

    const roundId = (await call("start_deck_round", {
      p_game: "hot_takes",
      p_hall: "huddle",
    })) as string;

    await call("deal_private", {
      p_round: roundId,
      p_idx: 0,
      p_to: clueGiver.id,
      p_content: JSON.stringify({ low: spectrum[0], high: spectrum[1], target }),
      p_answer: String(target),
    });

    await call("deal_deck", {
      p_round: roundId,
      p_items: [{ content: JSON.stringify({ low: spectrum[0], high: spectrum[1] }), meta: {} }],
    });
  },
  PhoneView: Phone,
};
