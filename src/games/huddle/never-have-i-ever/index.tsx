"use client";

import { useMemo } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { ContentCard, GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { NEVER_HAVE_I_EVER } from "@/config/decks";

/**
 * NEVER HAVE I EVER — tap in/out, escalating deck (warm → real → reckless,
 * already tiered in decks.ts). No reveal-gating drama needed for the tap
 * itself — the RLS reality is that pre-reveal you can only ever see your
 * OWN vote (everyone else's is sealed until `show_votes` flips), so the
 * honest UI is "locked in" pre-reveal and a real tally only once the host
 * opens it, same shape as every other vote-based game here.
 *
 * DELIBERATELY UNSCORED (P2 decision, not an oversight — award_points is
 * never called anywhere in this file). Every other vote-based game in the
 * app scores toward *guessing something correctly* — this one has no
 * correct answer, only an honest one. Attaching points to "I have" would
 * push exactly the wrong incentive for a talking-point/oversharing game:
 * people downplaying real answers to protect their score, which is the
 * opposite of what makes this game work. A "room can challenge an answer"
 * mechanic was considered and deliberately skipped for the same reason
 * this game earns its keep by staying simple and fast — it would need a
 * new dispute/adjudication flow for a feature that cuts against the
 * game's actual point (honesty, not correctness).
 */

type Tier = "warm" | "real" | "reckless";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function useTotalItems() {
  const { items } = useRoom();
  return useMemo(() => new Set(items.map((i) => i.idx)).size || 1, [items]);
}

const TIER_STYLE: Record<Tier, React.CSSProperties> = {
  warm: {
    color: "var(--color-gold)",
    borderColor: "var(--color-gold)",
    background: "color-mix(in oklab, var(--color-gold) 15%, transparent)",
  },
  real: {
    color: "var(--color-flame)",
    borderColor: "var(--color-flame)",
    background: "color-mix(in oklab, var(--color-flame) 15%, transparent)",
  },
  reckless: {
    color: "#dc2626",
    borderColor: "#dc2626",
    background: "rgba(220,38,38,0.14)",
  },
};

function TierPill({ tier }: { tier: Tier }) {
  return (
    <div className="rise mb-3 flex justify-center">
      <span
        className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
        style={TIER_STYLE[tier]}
      >
        {tier}
      </span>
    </div>
  );
}

function TallyPanel({ idx }: { idx: number }) {
  const { roster } = usePlayer();
  const { votes } = useRoom();
  const roundVotes = votes.filter((v) => v.idx === idx);
  const have = roundVotes.filter((v) => v.value === "have");
  const havent = roundVotes.filter((v) => v.value === "havent");

  return (
    <div className="rise space-y-4">
      <div className="flex items-center justify-center gap-6 text-center">
        <div>
          <p className="text-3xl font-black text-flame">{have.length}</p>
          <p className="text-xs text-mute">have</p>
        </div>
        <div className="h-10 w-px bg-line" />
        <div>
          <p className="text-3xl font-black">{havent.length}</p>
          <p className="text-xs text-mute">haven&apos;t</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {roundVotes.map((v) => {
          const p = roster.find((r) => r.id === v.player_id);
          if (!p) return null;
          return (
            <span
              key={v.id}
              className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: p.color, background: `${p.color}18` }}
            >
              <span>{p.emoji}</span> {p.name} {v.value === "have" ? "✋" : "🙅"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, votes, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();

  if (!round || !item) {
    return (
      <GameShell icon="🫣" title="Never Have I Ever">
        <WaitingOnHost label="Loading the deck…" />
      </GameShell>
    );
  }

  const cursor = round.item_cursor;
  const isLast = cursor >= totalItems - 1;
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDoneRound = round.phase === "done";
  const tier: Tier = (["warm", "real", "reckless"] as const).includes(
    item.meta?.tier as Tier,
  )
    ? (item.meta.tier as Tier)
    : "warm";

  const mine = votes.find((v) => v.player_id === me?.id && v.idx === cursor);

  async function vote(value: "have" | "havent") {
    if (!round) return;
    await call("cast_vote", { p_round: round.id, p_idx: cursor, p_value: value });
  }

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function next() {
    if (!round) return;
    if (isLast) {
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } else {
      await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
    }
  }

  return (
    <GameShell
      icon="🫣"
      title="Never Have I Ever"
      subtitle={`Statement ${cursor + 1} of ${totalItems}`}
      dock={
        isHost && !isDoneRound ? (
          <div className="flex gap-2 pt-3">
            {!revealed ? (
              <PrimaryButton onClick={() => void reveal()}>Reveal</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void next()}>
                {isLast ? "Finish round" : "Next statement →"}
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <TierPill tier={tier} />
      <ContentCard>{item.content}</ContentCard>

      <div className="mt-6">
        {!revealed ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {(["have", "havent"] as const).map((v) => {
                const active = mine?.value === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => void vote(v)}
                    className={`rounded-2xl border px-4 py-5 text-center text-base font-black tracking-tight transition active:scale-95 ${
                      active ? "border-flame bg-flame text-ink" : "border-line bg-ink-2 text-paper"
                    }`}
                  >
                    {v === "have" ? "I have" : "I haven't"}
                  </button>
                );
              })}
            </div>
            {mine && (
              <p className="mt-4 text-center text-xs text-mute">
                Locked in — the host reveals when everyone&apos;s answered.
              </p>
            )}
          </>
        ) : (
          <TallyPanel idx={cursor} />
        )}
      </div>
    </GameShell>
  );
}

export const neverHaveIEver: GameModule = {
  id: "never_have_i_ever",
  title: "Never Have I Ever",
  hall: "huddle",
  icon: "🫣",
  blurb: "Tap in or out. Escalates as the day goes on.",
  source: { kind: "deck" },
  minutes: 12,
  async start({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "never_have_i_ever",
      p_hall: "huddle",
    })) as string;

    const tiers: { tier: Tier; items: readonly string[] }[] = [
      { tier: "warm", items: NEVER_HAVE_I_EVER.warm },
      { tier: "real", items: NEVER_HAVE_I_EVER.real },
      { tier: "reckless", items: NEVER_HAVE_I_EVER.reckless },
    ];

    const deckItems = tiers.flatMap(({ tier, items }) =>
      shuffle([...items]).map((content) => ({ content, meta: { tier } })),
    );

    await call("deal_deck", { p_round: roundId, p_items: deckItems });
  },
  PhoneView: Phone,
};
