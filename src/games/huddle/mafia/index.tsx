"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, ContentCard, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { PersonVote } from "@/components/play/PersonVote";

/**
 * MAFIA — moody night/day, moon-to-sun. Deliberately lighter-weight than a
 * fully state-machined engine: the app deals roles and hides the night's
 * kill vote until the host opens it, but "who's still alive" is tracked in
 * the HOST's own local state, not new schema. A live game of Mafia is
 * always run by a moderator narrating out loud anyway — this just gives
 * that moderator a private ballot box and a scoreboard, same division of
 * labor as the real thing.
 */

const NIGHT_BG = "radial-gradient(circle at 50% 20%, #1a1723, #08070c 70%)";
const DAY_BG = "radial-gradient(circle at 50% 0%, #ffc24722, transparent 70%)";

// Named so Phone() can tell the mafia player apart from their OWN role card
// (see the comment on iAmMafia below) rather than only from round_secrets,
// and so start() below can't drift out of sync with what Phone() compares
// against.
const MAFIA_ROLE = "You are the MAFIA. Each night, secretly pick someone to eliminate.";
const TOWN_ROLE = "You are a TOWNSPERSON. Find the Mafia before they pick everyone off.";

function Phone() {
  const { me, roster } = usePlayer();
  const { round, items, secrets, votes, isHost, call } = useRoom();
  // NOT useCurrentItems(): that filters to items.idx === item_cursor, but
  // Mafia repurposes item_cursor as its own night/day counter (isNight,
  // below) rather than an item index — unlike Spyfall/Chameleon, which deal
  // an identical role card at idx 0 but never advance the cursor at all, so
  // this mismatch never bit them. Mafia's role card is dealt once, always at
  // idx 0 (deal_roles, 0007), and needed for the WHOLE game — so it has to
  // be found by kind alone, cursor-independent, or it silently disappears
  // (and "Loading your role…" shows forever) the moment night one ends and
  // the cursor first advances to 1. This is also what iAmMafia below reads,
  // so the mafia-vote fix a few lines down would have quietly broken again
  // on day one without this.
  const myRole = items.find((i) => i.kind === "role");
  const cursor = round?.item_cursor ?? 0;
  const isNight = cursor % 2 === 0;

  // Host-local elimination tracker. Resets whenever a fresh round begins.
  const [dead, setDead] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<"mafia" | "town" | null>(null);

  // round_secrets is sealed until the round's phase is 'reveal'/'done' (0005)
  // — which the night-vote UI below can never simultaneously satisfy, since
  // it only shows while `!revealed`. Deriving mafiaId from secrets is only
  // safe for reveal-time uses (RevealDead's nightVote lookup). Whether *this*
  // phone is the mafia has to come from something visible immediately: its
  // own role card, dealt via round_items (visible_to-scoped, not phase-
  // gated) — the same source Spyfall already trusts for "am I the spy".
  const mafiaId = secrets.find((s) => s.idx === 0)?.author ?? null;
  const iAmMafia = myRole?.content === MAFIA_ROLE;
  const alive = roster.filter((p) => p.claimed_by && !dead.has(p.id));

  async function openReveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function markDead(id: string) {
    setDead((prev) => new Set(prev).add(id));
  }

  async function nextPhase() {
    if (!round) return;
    await call("set_cursor", { p_round: round.id, p_cursor: cursor + 1 });
  }

  async function endGame(side: "mafia" | "town") {
    if (!round || !mafiaId) return;
    setWinner(side);
    const survivors =
      side === "mafia" ? [mafiaId] : alive.filter((p) => p.id !== mafiaId).map((p) => p.id);
    for (const id of survivors) {
      await call("award_points", {
        p_player: id,
        p_points: 200,
        p_reason: "mafia_win",
        p_round: round.id,
      });
    }
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  if (!round) {
    return (
      <GameShell icon="🌙" title="Mafia">
        <WaitingOnHost label="Dealing roles…" />
      </GameShell>
    );
  }

  const nightVote = votes.find((v) => v.idx === cursor && v.player_id === mafiaId);
  const revealed = round.phase === "reveal" || round.phase === "done";

  return (
    <GameShell
      icon={isNight ? "🌙" : "☀️"}
      title="Mafia"
      subtitle={isNight ? "Night — eyes closed" : "Day — discuss and vote"}
      dock={
        isHost && !winner ? (
          <div className="flex flex-col gap-2 pt-3">
            {!revealed && (
              <PrimaryButton style={{ background: isNight ? "#6366f1" : "#ffc247" }} onClick={openReveal}>
                {isNight ? "Reveal who was chosen" : "Reveal the vote"}
              </PrimaryButton>
            )}
            {revealed && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void endGame("town")}
                    className="flex-1 rounded-2xl border border-emerald-400/50 py-2 text-xs font-bold text-emerald-300 active:scale-95"
                  >
                    Town wins
                  </button>
                  <button
                    type="button"
                    onClick={() => void endGame("mafia")}
                    className="flex-1 rounded-2xl border border-flame/50 py-2 text-xs font-bold text-flame active:scale-95"
                  >
                    Mafia wins
                  </button>
                </div>
                <PrimaryButton style={{ background: "#6366f1" }} onClick={nextPhase}>
                  {isNight ? "Move to day →" : "Move to next night →"}
                </PrimaryButton>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <div
        className="rounded-3xl border border-line p-6"
        style={{ background: isNight ? NIGHT_BG : DAY_BG }}
      >
        {myRole ? (
          <ContentCard>{myRole.content}</ContentCard>
        ) : (
          <p className="text-center text-sm text-mute">Loading your role…</p>
        )}
      </div>

      <div className="mt-6">
        {winner && (
          <p className="rise text-center text-xl font-black" style={{ color: winner === "mafia" ? "#ff5c39" : "#34d399" }}>
            {winner === "mafia" ? "The Mafia wins." : "The Town wins."}
          </p>
        )}

        {!winner && isNight && iAmMafia && !revealed && (
          <div>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
              Choose your target
            </p>
            {/* Excluding "myself" from the target list can't come from
                mafiaId here — that's sourced from secrets, which is sealed
                until reveal, i.e. null at exactly the moment this renders.
                me.id is always known, and this branch only ever renders for
                the mafia player (iAmMafia gates it above), so it's the same
                exclusion, just from a source that's actually available yet. */}
            <PersonVote idx={cursor} exclude={me ? [me.id] : []} />
          </div>
        )}
        {!winner && isNight && !iAmMafia && !revealed && (
          <WaitingOnHost label="Eyes closed. The Mafia is choosing." />
        )}
        {!winner && isNight && revealed && (
          <RevealDead
            targetId={nightVote?.value}
            roster={roster}
            onMark={markDead}
          />
        )}

        {!winner && !isNight && !revealed && (
          <div>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
              Who&apos;s the Mafia?
            </p>
            <PersonVote idx={cursor} />
          </div>
        )}
        {!winner && !isNight && revealed && (
          <AccuseResult idx={cursor} roster={roster} onMark={markDead} />
        )}

        {dead.size > 0 && (
          <p className="mt-6 text-center text-xs text-mute">
            Out: {[...dead].map((id) => roster.find((p) => p.id === id)?.name).join(", ")}
          </p>
        )}
      </div>
    </GameShell>
  );
}

function RevealDead({
  targetId,
  roster,
  onMark,
}: {
  targetId?: string;
  roster: { id: string; name: string; emoji: string; color: string }[];
  onMark: (id: string) => void;
}) {
  const target = roster.find((p) => p.id === targetId);
  return (
    <div className="rise text-center">
      {target ? (
        <>
          <p className="text-lg font-bold">{target.name} was chosen.</p>
          <button
            type="button"
            onClick={() => onMark(target.id)}
            className="mt-3 rounded-full border border-line px-4 py-2 text-xs font-bold active:scale-95"
          >
            Mark them out
          </button>
        </>
      ) : (
        <p className="text-mute">No target was chosen.</p>
      )}
    </div>
  );
}

function AccuseResult({
  idx,
  roster,
  onMark,
}: {
  idx: number;
  roster: { id: string; name: string; emoji: string; color: string }[];
  onMark: (id: string) => void;
}) {
  const { votes } = useRoom();
  const tally = new Map<string, number>();
  for (const v of votes.filter((v) => v.idx === idx)) {
    tally.set(v.value, (tally.get(v.value) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  const accused = top ? roster.find((p) => p.id === top[0]) : null;
  return (
    <div className="rise text-center">
      {accused ? (
        <>
          <p className="text-lg font-bold">
            The room voted out {accused.name} ({top?.[1]} votes).
          </p>
          <button
            type="button"
            onClick={() => onMark(accused.id)}
            className="mt-3 rounded-full border border-line px-4 py-2 text-xs font-bold active:scale-95"
          >
            Mark them out
          </button>
        </>
      ) : (
        <p className="text-mute">No votes yet.</p>
      )}
    </div>
  );
}

export const mafia: GameModule = {
  id: "mafia",
  title: "Mafia",
  hall: "huddle",
  icon: "🌙",
  blurb: "One Mafia hides among the Town. Night falls, someone disappears.",
  source: { kind: "roles" },
  minutes: 20,
  async start({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "mafia",
      p_hall: "huddle",
    })) as string;
    await call("deal_roles", {
      p_round: roundId,
      p_shared_content: TOWN_ROLE,
      p_odd_content: MAFIA_ROLE,
      p_odd_count: 1,
    });
  },
  PhoneView: Phone,
};
