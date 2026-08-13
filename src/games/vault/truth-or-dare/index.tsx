"use client";

import { useMemo, useState } from "react";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton } from "@/components/play/GameShell";
import { TRUTHS, DARES } from "@/config/decks";

/**
 * TRUTH OR DARE — tiered Warm → Real → Reckless, with a 2-pass-per-day
 * economy that costs leaderboard points.
 *
 * Content ships as one shuffled deck dealt in a single deal_deck() call
 * (0007) — each item carries {kind, tier} in `meta`, which deal_deck stores
 * as-is. No survey content needed; decks.ts already covers this game, per
 * the brief. pass_and_advance() (0012) is the one genuinely self-service
 * write in the whole app: a player spending their own pass doesn't need the
 * host, and it advances the shared card itself (not just the point spend —
 * see 0012's header for why use_pass() alone wasn't enough).
 *
 * VISUAL IDENTITY: the screen itself escalates. The accent color and the
 * background glow intensify tier over tier (amber → orange → deep red),
 * and Truth vs Dare get structurally different card treatments — Truth
 * quiet and centered, Dare loud, harder-edged, thrown on at a skew — so a
 * glance tells you what kind of card it is before you've read a word.
 */

type Tier = "warm" | "real" | "reckless";
type Kind = "truth" | "dare";
type DeckMeta = { kind: Kind; tier: Tier };

const TIERS: Tier[] = ["warm", "real", "reckless"];
const PER_TIER = 2;

const TIER_LABEL: Record<Tier, string> = {
  warm: "Warm",
  real: "Real",
  reckless: "Reckless",
};

/** Escalating accent, derived from the two tokens the app already has. */
const TIER_ACCENT: Record<Tier, string> = {
  warm: "var(--color-gold)",
  real: "var(--color-flame)",
  reckless: "color-mix(in oklab, var(--color-flame) 55%, black)",
};

const TIER_GLOW: Record<Tier, number> = {
  warm: 0.08,
  real: 0.16,
  reckless: 0.26,
};

function pick<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const j = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(j, 1)[0]);
  }
  return out;
}

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

function isDeckMeta(m: unknown): m is DeckMeta {
  if (!m || typeof m !== "object") return false;
  const rec = m as Record<string, unknown>;
  return (
    (rec.kind === "truth" || rec.kind === "dare") &&
    (rec.tier === "warm" || rec.tier === "real" || rec.tier === "reckless")
  );
}

/** Scoped keyframes for this game only. */
function TodStyle() {
  return (
    <style>{`
      @keyframes tod-throw {
        from { transform: rotate(-6deg) scale(0.92); opacity: 0; }
        to   { transform: rotate(-2deg) scale(1); opacity: 1; }
      }
      .tod-dare { animation: tod-throw 0.4s cubic-bezier(0.2,0.8,0.2,1) both; }
      @keyframes tod-settle {
        from { transform: translateY(8px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .tod-truth { animation: tod-settle 0.5s ease-out both; }
    `}</style>
  );
}

function Phone() {
  const { round, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const totalItems = useTotalItems();
  const [passMsg, setPassMsg] = useState<string | null>(null);

  const cursor = round?.item_cursor ?? 0;
  const isLast = round ? round.item_cursor >= totalItems - 1 : false;

  const rawMeta = item?.meta;
  const meta = isDeckMeta(rawMeta) ? rawMeta : undefined;
  const tier: Tier = meta?.tier ?? "warm";
  const kind: Kind = meta?.kind ?? "truth";
  const accent = TIER_ACCENT[tier];
  const glow = TIER_GLOW[tier];

  async function next() {
    if (!round) return;
    if (isLast) {
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } else {
      await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
    }
  }

  async function pass() {
    if (!round) return;
    setPassMsg(null);
    try {
      await call("pass_and_advance", { p_round: round.id });
    } catch (e) {
      setPassMsg(e instanceof Error ? e.message : "couldn't use a pass");
    }
  }

  if (!round || !item) {
    return (
      <GameShell icon="🔒" title="Truth or Dare">
        <div className="rise flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-8 text-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-flame" />
          <p className="text-sm text-mute">Dealing the deck…</p>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="🔒"
      title="Truth or Dare"
      subtitle={`Card ${cursor + 1} of ${totalItems}`}
      dock={
        isHost ? (
          <div className="flex gap-2 pt-3">
            <PrimaryButton
              onClick={() => void next()}
              style={{ background: accent, color: "var(--color-ink)" }}
            >
              {isLast ? "Finish round" : "Next card →"}
            </PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <TodStyle />

      {/* Escalating background glow, keyed to tier */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${accent}, transparent 60%)`,
          opacity: glow,
        }}
      />

      <div className="mb-4 flex items-center justify-center gap-2">
        <span
          className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ borderColor: accent, color: accent }}
        >
          {kind === "truth" ? "Truth" : "Dare"}
        </span>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ background: accent, color: "var(--color-ink)" }}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>

      {kind === "truth" ? (
        <div
          key={cursor}
          className="tod-truth rounded-3xl border p-8 text-center"
          style={{
            borderColor: "color-mix(in oklab, var(--color-line) 70%, transparent)",
            background: "var(--color-ink-2)",
          }}
        >
          <p className="text-lg font-semibold italic leading-relaxed text-paper/90">
            {item.content}
          </p>
        </div>
      ) : (
        <div
          key={cursor}
          className="tod-dare rounded-xl border-2 px-6 py-9 text-center"
          style={{
            borderColor: accent,
            background: `color-mix(in oklab, ${accent} 14%, var(--color-ink-2))`,
            boxShadow: `0 10px 0 -4px color-mix(in oklab, ${accent} 40%, transparent)`,
          }}
        >
          <p className="text-xl font-black uppercase leading-tight tracking-tight">
            {item.content}
          </p>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void pass()}
          className="w-full rounded-2xl border border-line px-5 py-3 text-center text-sm font-bold text-paper transition active:scale-[0.98]"
        >
          Pass
        </button>
        <p className="mt-2 text-center text-xs text-mute">
          {passMsg ?? "Passing costs 25 points — 2 a day."}
        </p>
      </div>
    </GameShell>
  );
}

export const truthOrDare: GameModule = {
  id: "truth_or_dare",
  title: "Truth or Dare",
  hall: "vault",
  icon: "🔒",
  blurb: "Warm, Real, or Reckless — pick your poison, or pay to pass.",
  source: { kind: "deck" },
  minutes: 15,
  async start({ call }) {
    const roundId = (await call("start_deck_round", {
      p_game: "truth_or_dare",
      p_hall: "vault",
    })) as string;

    const items: { content: string; meta: DeckMeta }[] = [];

    for (const tier of TIERS) {
      for (const content of pick(TRUTHS[tier], PER_TIER)) {
        items.push({ content, meta: { kind: "truth", tier } });
      }
      for (const content of pick(DARES[tier], PER_TIER)) {
        items.push({ content, meta: { kind: "dare", tier } });
      }
    }

    const deck = shuffle(items);

    const dealt = (await call("deal_deck", {
      p_round: roundId,
      p_items: deck,
    })) as number;

    if (!dealt) {
      throw new Error("nothing to deal");
    }
  },
  PhoneView: Phone,
};
