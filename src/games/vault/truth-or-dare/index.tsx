"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton } from "@/components/play/GameShell";
import { RoundTimer } from "@/components/play/RoundTimer";
import { TRUTHS, DARES } from "@/config/decks";
import { FORFEITS } from "@/config/their-rounds";

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
 * THE FORFEIT (docs/THEIR_ROUNDS.md §2.1). One card at the end of every
 * deck isn't a card at all: it's a Reckless-tier forfeit involving a real
 * person outside this room, dealt by Postgres to ONE randomly chosen player
 * and invisible to the other five. It ships here rather than as its own
 * game because §5 said so and because it needs this game's economy —
 * refusing a forfeit costs a pass token, through exactly the same
 * pass_and_advance() everything else here uses. Nothing new to explain.
 *
 * Every forfeit carries a `needs` line, and the one phone holding it can
 * swap it for another without telling anyone why (reroll_forfeit, 0016).
 * That's where §2.1's hard "never deal a forfeit that doesn't fit its
 * target" requirement actually lives — read 0016's header before touching
 * it, the obvious alternatives are worse.
 *
 * VISUAL IDENTITY: the screen itself escalates. The accent color and the
 * background glow intensify tier over tier (amber → orange → deep red),
 * and Truth vs Dare get structurally different card treatments — Truth
 * quiet and centered, Dare loud, harder-edged, thrown on at a skew — so a
 * glance tells you what kind of card it is before you've read a word. The
 * forfeit goes past all three: siren red, full-bleed, and a countdown.
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
      @keyframes tod-siren {
        0%, 100% { opacity: 0.20; }
        50%      { opacity: 0.38; }
      }
      .tod-siren { animation: tod-siren 2.4s ease-in-out infinite; }
    `}</style>
  );
}

const FORFEIT_RED = "#dc2626";
const FORFEIT_SECONDS = 120;

/**
 * The forfeit, on the one phone it was dealt to. The `needs` line is the
 * whole eligibility mechanic — read it before you read the card, and swap
 * without explaining yourself if it isn't you.
 */
function ForfeitCard({
  content,
  needs,
  onReroll,
  rerolling,
  error,
}: {
  content: string;
  needs: string | null;
  onReroll: () => void;
  rerolling: boolean;
  error: string | null;
}) {
  return (
    <div
      key={content}
      className="tod-dare rounded-2xl border-2 px-6 py-8"
      style={{
        borderColor: FORFEIT_RED,
        background: `linear-gradient(160deg, color-mix(in oklab, ${FORFEIT_RED} 26%, var(--color-ink-2)), var(--color-ink-2))`,
        boxShadow: `0 12px 0 -5px color-mix(in oklab, ${FORFEIT_RED} 45%, transparent)`,
      }}
    >
      <p
        className="text-center text-[10px] font-black uppercase tracking-[0.3em]"
        style={{ color: FORFEIT_RED }}
      >
        Forfeit · yours alone
      </p>
      <p className="mt-4 text-center text-lg font-black leading-snug">{content}</p>

      {needs && (
        <div className="mt-5 rounded-xl border border-line bg-ink px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">
            This one assumes you have
          </p>
          <p className="mt-1 text-sm font-semibold">{needs}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onReroll}
        disabled={rerolling}
        className="mt-4 w-full rounded-2xl border border-line px-5 py-3 text-center text-sm font-bold text-paper transition active:scale-[0.98] disabled:opacity-40"
      >
        {rerolling ? "Dealing another…" : "Doesn't apply to me — deal me another"}
      </button>
      <p className="mt-2 text-center text-xs text-mute">
        {error ?? "Nobody is told you swapped, or why. Free, and as many times as you need."}
      </p>
    </div>
  );
}

/** What the other five see: that something is happening, and to whom. */
function ForfeitWatch({ name, emoji }: { name: string; emoji: string }) {
  return (
    <div
      className="tod-dare rounded-2xl border-2 px-6 py-10 text-center"
      style={{
        borderColor: FORFEIT_RED,
        background: `linear-gradient(160deg, color-mix(in oklab, ${FORFEIT_RED} 18%, var(--color-ink-2)), var(--color-ink-2))`,
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.3em]"
        style={{ color: FORFEIT_RED }}
      >
        Forfeit
      </p>
      <p className="mt-4 text-4xl">{emoji}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{name}</p>
      <p className="mt-4 text-sm leading-relaxed text-mute">
        Something is on their phone that none of you can see. They&apos;re about to phone
        somebody about it.
      </p>
    </div>
  );
}

function Phone() {
  const { me, roster } = usePlayer();
  const { round, isHost, call } = useRoom();
  const here = useCurrentItems();
  const totalItems = useTotalItems();
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const [rerollMsg, setRerollMsg] = useState<string | null>(null);

  const forfeitMarker = here.find((i) => i.kind === "forfeit");
  const myForfeit = here.find((i) => i.kind === "private");
  const item = forfeitMarker ?? here.find((i) => i.kind === "deck") ?? here[0];

  const cursor = round?.item_cursor ?? 0;
  const isLast = round ? round.item_cursor >= totalItems - 1 : false;

  const rawMeta = forfeitMarker ? undefined : item?.meta;
  const meta = isDeckMeta(rawMeta) ? rawMeta : undefined;
  const tier: Tier = meta?.tier ?? "warm";
  const kind: Kind = meta?.kind ?? "truth";
  const accent = forfeitMarker ? FORFEIT_RED : TIER_ACCENT[tier];
  const glow = forfeitMarker ? 0.3 : TIER_GLOW[tier];

  const forfeitTo =
    typeof forfeitMarker?.meta?.to === "string" ? (forfeitMarker.meta.to as string) : null;
  const target = roster.find((p) => p.id === forfeitTo);
  const iAmTarget = Boolean(me && forfeitTo === me.id);
  const needs =
    typeof myForfeit?.meta?.needs === "string" ? (myForfeit.meta.needs as string) : null;

  async function reroll() {
    if (!round || rerolling) return;
    setRerolling(true);
    setRerollMsg(null);
    try {
      await call("reroll_forfeit", { p_round: round.id, p_deck: FORFEITS });
    } catch (e) {
      setRerollMsg(e instanceof Error ? e.message : "couldn't deal another");
    } finally {
      setRerolling(false);
    }
  }

  async function settle(did: boolean) {
    if (!round || !forfeitTo) return;
    await call("award_points", {
      p_player: forfeitTo,
      p_points: did ? 400 : -100,
      p_reason: did ? "forfeit_done" : "forfeit_chickened",
      p_round: round.id,
    });
    await next();
  }

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
      subtitle={
        forfeitMarker ? "Forfeit" : `Card ${cursor + 1} of ${totalItems}`
      }
      dock={
        isHost ? (
          forfeitMarker ? (
            // The forfeit is adjudicated out loud — they either rang the
            // person or they didn't — so it's the one card in the deck the
            // host settles rather than just advancing past.
            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => void settle(false)}
                className="flex-1 rounded-2xl border border-line py-3 text-xs font-bold text-mute active:scale-95"
              >
                Chickened (−100)
              </button>
              <button
                type="button"
                onClick={() => void settle(true)}
                className="flex-[2] rounded-2xl py-3 text-sm font-black text-white active:brightness-90"
                style={{ background: FORFEIT_RED }}
              >
                They did it — +400
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-3">
              <PrimaryButton
                onClick={() => void next()}
                style={{ background: accent, color: "var(--color-ink)" }}
              >
                {isLast ? "Finish round" : "Next card →"}
              </PrimaryButton>
            </div>
          )
        ) : undefined
      }
    >
      <TodStyle />

      {/* Escalating background glow, keyed to tier — and past the top of the
          scale for the forfeit, where it pulses rather than sits still. */}
      <div
        className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500 ${
          forfeitMarker ? "tod-siren" : ""
        }`}
        style={{
          background: `radial-gradient(circle at 50% 30%, ${accent}, transparent 60%)`,
          opacity: glow,
        }}
      />

      {forfeitMarker ? (
        <>
          <div className="mb-4 text-center">
            <RoundTimer seconds={FORFEIT_SECONDS} className="text-4xl leading-none" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
              to make the call
            </p>
          </div>

          {iAmTarget && myForfeit ? (
            <ForfeitCard
              content={myForfeit.content}
              needs={needs}
              onReroll={() => void reroll()}
              rerolling={rerolling}
              error={rerollMsg}
            />
          ) : (
            <ForfeitWatch
              name={target?.name ?? "Someone"}
              emoji={target?.emoji ?? "🔥"}
            />
          )}

          <div className="mt-6">
            {iAmTarget && (
              <>
                <button
                  type="button"
                  onClick={() => void pass()}
                  className="w-full rounded-2xl border border-line px-5 py-3 text-center text-sm font-bold text-paper transition active:scale-[0.98]"
                >
                  Refuse it
                </button>
                <p className="mt-2 text-center text-xs text-mute">
                  {passMsg ?? "Refusing spends a pass — 25 points, 2 a day, same as any card."}
                </p>
              </>
            )}
            {!iAmTarget && (
              <p className="text-center text-xs text-mute">
                They can swap it if it doesn&apos;t fit them, and you&apos;ll never know they
                did.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
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

    // THEIR_ROUNDS §2.1 — one forfeit at the end of every deck, dealt by
    // Postgres to a random claimed player so the dealing device isn't the
    // one choosing who gets it (same reasoning as deal_roles in 0007). The
    // deck goes over as public content; the card that comes back is
    // visible to exactly one phone.
    await call("deal_forfeit", {
      p_round: roundId,
      p_idx: dealt,
      p_deck: FORFEITS,
    });
  },
  PhoneView: Phone,
};
