"use client";

import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";

/**
 * Vote among what people just wrote — Fibbage's lies-plus-the-truth,
 * Best Answer's submitted punchlines. Both need the same shape: a shuffled
 * list of anonymous options, tap one, can't pick your own.
 *
 * Submissions only become visible once the host opens them (`show_submissions`
 * — see room.tsx / 0006's set_reveal), so this component naturally renders
 * nothing useful until that happens; callers should gate on
 * `round.show_submissions` before showing it.
 */
export function SubmissionVote({ idx }: { idx: number }) {
  const { me } = usePlayer();
  const { round, submissions, votes, call } = useRoom();

  const options = submissions.filter(
    (s) => s.idx === idx && s.player_id !== me?.id,
  );
  const mine = votes.find((v) => v.player_id === me?.id && v.idx === idx);

  async function vote(submissionId: string) {
    if (!round) return;
    await call("cast_vote", { p_round: round.id, p_idx: idx, p_value: submissionId });
  }

  if (options.length === 0) {
    return <p className="text-center text-sm text-mute">Waiting on the options…</p>;
  }

  return (
    <div className="space-y-2">
      {options.map((o) => {
        const picked = mine?.value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => void vote(o.id)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
              picked ? "border-flame bg-flame/10" : "border-line bg-ink-2"
            }`}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}
