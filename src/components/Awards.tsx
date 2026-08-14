"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player";
import { getSupabase } from "@/lib/supabase/client";
import { useRoom } from "@/lib/game/room";
import { Leaderboard } from "@/components/play/Leaderboard";
import { BackToHub } from "@/components/BackToHub";

// Files in public/ are copied verbatim and get no automatic rewriting — see
// layout.tsx's own BASE constant for why this has to be here too.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * AWARDS — end-of-day superlatives, computed from the real ledger rather
 * than typed in by hand. Deliberately built from signals that are robust
 * across all sixteen games rather than exact `scores.reason` strings —
 * those strings were written independently across three build sessions, so
 * pattern-matching every game's own vocabulary would be fragile. Activity
 * counts (who submitted the most, who passed the most, who took the most
 * photos) are true regardless of which game produced them.
 */

type Row = { player_id: string; n: number };

function useCounts(table: string) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from(table).select("player_id");
      if (cancelled || !data) return;
      const tally = new Map<string, number>();
      for (const r of data as { player_id: string | null }[]) {
        if (!r.player_id) continue;
        tally.set(r.player_id, (tally.get(r.player_id) ?? 0) + 1);
      }
      setRows([...tally.entries()].map(([player_id, n]) => ({ player_id, n })));
    })();
    return () => {
      cancelled = true;
    };
  }, [table]);
  return rows;
}

function usePassCounts() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("scores").select("player_id,reason").eq("reason", "pass");
      if (cancelled || !data) return;
      const tally = new Map<string, number>();
      for (const r of data as { player_id: string }[]) {
        tally.set(r.player_id, (tally.get(r.player_id) ?? 0) + 1);
      }
      setRows([...tally.entries()].map(([player_id, n]) => ({ player_id, n })));
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return rows;
}

function top(rows: Row[]) {
  return [...rows].sort((a, b) => b.n - a.n)[0];
}

function AwardCard({
  title,
  desc,
  winner,
  n,
  unit,
}: {
  title: string;
  desc: string;
  winner: { name: string; emoji: string; color: string } | undefined;
  n: number;
  unit: string;
}) {
  if (!winner || n === 0) return null;
  return (
    <div className="rise rounded-3xl border border-line bg-ink-2 p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">{title}</p>
      <p className="mt-1 text-xs text-mute">{desc}</p>
      <div className="mt-4 flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-full text-2xl"
          style={{ background: `${winner.color}22` }}
        >
          {winner.emoji}
        </span>
        <div>
          <p className="text-lg font-black">{winner.name}</p>
          <p className="text-xs text-mute">
            {n} {unit}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Awards() {
  const { roster } = usePlayer();
  const { leaderboard } = useRoom();
  const submissions = useCounts("submissions");
  const votes = useCounts("votes");
  const photos = useCounts("evidence_photos");
  const passes = usePassCounts();

  const mvp = leaderboard[0];
  const topSubmitter = top(submissions);
  const topVoter = top(votes);
  const topPhotographer = top(photos);
  const biggestCoward = top(passes);

  const find = (id?: string) => roster.find((r) => r.id === id);

  return (
    <main className="mx-auto max-w-md px-5 pad-safe-t pad-safe-b">
      <BackToHub className="mb-3 block" />

      <img
        src={`${BASE}/art/awards-hero.webp`}
        alt=""
        className="rise h-56 w-full rounded-3xl border border-line object-cover"
      />

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-mute">
        Commutation
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Awards</h1>
      <p className="mt-2 text-sm text-mute">Computed from what actually happened today.</p>

      {mvp && mvp.points > 0 && (
        <div
          className="rise mt-6 rounded-3xl border-2 p-6 text-center"
          style={{ borderColor: mvp.color, background: `${mvp.color}14` }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold">👑 MVP</p>
          <p className="mt-2 text-4xl">{mvp.emoji}</p>
          <p className="mt-1 text-2xl font-black">{mvp.name}</p>
          <p className="mt-1 text-sm text-mute">{mvp.points} points</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <AwardCard
          title="Biggest Coward"
          desc="Passed the most, 25 points a time."
          winner={find(biggestCoward?.player_id)}
          n={biggestCoward?.n ?? 0}
          unit="passes"
        />
        <AwardCard
          title="Most Voted"
          desc="Cast the most votes across the day."
          winner={find(topVoter?.player_id)}
          n={topVoter?.n ?? 0}
          unit="votes"
        />
        <AwardCard
          title="Most Answers"
          desc="Wrote or submitted the most, of anyone."
          winner={find(topSubmitter?.player_id)}
          n={topSubmitter?.n ?? 0}
          unit="submissions"
        />
        <AwardCard
          title="Evidence Champion"
          desc="Took the most photos when the prompt hit."
          winner={find(topPhotographer?.player_id)}
          n={topPhotographer?.n ?? 0}
          unit="photos"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-mute">
          Final standings
        </h2>
        <div className="mt-3">
          <Leaderboard />
        </div>
      </section>
    </main>
  );
}
