"use client";

import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";

/**
 * "Who wrote it / who's most likely / who's the spy" — the single most
 * reused interaction in the Vault and the Huddle. One vote per player per
 * item, sent through cast_vote(), sealed until the host reveals it.
 *
 * Excludes whoever you're not allowed to pick, per `exclude` — Who Wrote It?
 * shouldn't let you accuse yourself, Most Likely To usually should.
 */
export function PersonVote({
  idx,
  exclude,
  onVoted,
}: {
  idx: number;
  exclude?: string[];
  onVoted?: (value: string) => void;
}) {
  const { roster, me } = usePlayer();
  const { round, votes, call } = useRoom();

  const mine = votes.find((v) => v.player_id === me?.id && v.idx === idx);
  const options = roster.filter((p) => !exclude?.includes(p.id));

  async function vote(id: string) {
    if (!round) return;
    await call("cast_vote", { p_round: round.id, p_idx: idx, p_value: id });
    onVoted?.(id);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((p) => {
        const picked = mine?.value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => void vote(p.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition active:scale-95 ${
              picked ? "border-transparent" : "border-line bg-ink-2"
            }`}
            style={
              picked ? { background: `${p.color}26`, borderColor: p.color } : undefined
            }
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-xs font-semibold">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
