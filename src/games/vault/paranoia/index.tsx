"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule, GameViewProps } from "@/lib/game/types";
import { GameShell, GhostButton, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";

/**
 * PARANOIA — "Who here would ___?" One phone privately gets the question,
 * that person answers OUT LOUD (a name), and a coin flip decides if the
 * room ever learns the question that was asked.
 *
 * deal_private() (0007) writes the question to round_items scoped to one
 * player's visible_to — Postgres RLS means only their device ever receives
 * that row. Everyone else's `items` array for this round is simply empty
 * until (and unless) the host calls reveal_item(), which nulls visible_to
 * and makes it public to all. No client-side identity check needed.
 *
 * Content is authored inline below rather than pulled from the survey's
 * `paranoia` question bank — the brief for this game specifically avoids
 * needing to read any sealed survey text at all.
 *
 * VISUAL IDENTITY: the darkest, quietest screen in the app. A tight
 * spotlight around the question, everything else recedes to near-black —
 * and the host's decision plays out as an actual flipping coin before the
 * round updates, so the moment has weight instead of just being a tap.
 *
 * SYNCED FLIP: the coin used to be local useState on whichever phone tapped
 * the button — it animated there, then the RPC call updated round.phase for
 * everyone else, who never saw a flip at all. Fixed by broadcasting the
 * flip itself as a round_events row (kind: 'coin_flip', migration 0008 —
 * the same "everyone needs this the instant it happens" primitive Buzz In
 * uses for who-buzzed-first) instead of driving the animation off local
 * click state. Every phone, including the host's, renders the flip from
 * useCoinFlip() below, so all six land on the same frame together. The
 * host still owns the outcome and the follow-up RPC call, just delayed
 * until after the shared animation plays out.
 */

const FLIP_MS = 900;

/**
 * Every phone (host included) renders the flip off the same broadcast row,
 * timed against the event's own server timestamp — same reasoning as
 * RoundTimer.tsx reading from round.started_at instead of a local clock,
 * so a phone that was mid-render when the event arrived still lands on the
 * right frame instead of getting a full fresh FLIP_MS window late.
 */
function useCoinFlip(): "reveal" | "secret" | null {
  const { events } = useRoom();
  const [flipping, setFlipping] = useState<"reveal" | "secret" | null>(null);

  const latest = events.filter((e) => e.kind === "coin_flip" && e.idx === 0).at(-1);
  const latestId = latest?.id ?? null;

  useEffect(() => {
    if (!latest || (latest.value !== "reveal" && latest.value !== "secret")) return;

    // A late joiner re-fetching events shouldn't replay a flip that already
    // resolved.
    const remaining = FLIP_MS - (Date.now() - new Date(latest.created_at).getTime());
    if (remaining <= 0) return;

    const value = latest.value as "reveal" | "secret";
    const apply = () => setFlipping(value);
    apply();
    const t = setTimeout(() => setFlipping(null), remaining);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId]);

  return flipping;
}

const PARANOIA_QUESTIONS: string[] = [
  "Who here would be the easiest to talk into a bad idea?",
  "Who here is most likely already keeping a secret from this exact group?",
  "Who here would survive longest without their phone?",
  "Who here would you trust to plan your entire week for you?",
  "Who here has talked about you the most, good or bad?",
  "Who here would crack first if the others questioned them for ten minutes straight?",
  "Who here is secretly the most competitive in this room?",
  "Who here would you want next to you in an actual emergency?",
  "Who here has the best read on everyone else's business?",
  "Who here would least surprise you by moving away and never coming back?",
];

/** Scoped keyframes for this game only. */
function ParStyle() {
  return (
    <style>{`
      @keyframes par-coinflip {
        0%   { transform: rotateY(0deg) scale(1); }
        45%  { transform: rotateY(900deg) scale(1.2); }
        100% { transform: rotateY(1080deg) scale(1); }
      }
      .par-coin {
        animation: par-coinflip 0.9s cubic-bezier(0.22,1,0.36,1) both;
        transform-style: preserve-3d;
      }
      @keyframes par-drift {
        0%, 100% { background-position: 50% 40%; }
        50% { background-position: 50% 48%; }
      }
      .par-vignette { animation: par-drift 8s ease-in-out infinite; }
    `}</style>
  );
}

function Vignette() {
  return (
    <div
      className="par-vignette pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.05), transparent 55%), var(--color-ink)",
      }}
    />
  );
}

function CoinFlip({ landing }: { landing: "reveal" | "secret" }) {
  return (
    <div className="rise flex flex-col items-center gap-4 py-10">
      <div
        className="par-coin grid h-20 w-20 place-items-center rounded-full border-2 text-3xl"
        style={{
          borderColor: "var(--color-gold)",
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--color-gold) 60%, white), var(--color-ink-3))",
        }}
      >
        {landing === "reveal" ? "👁️" : "🔒"}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">
        {landing === "reveal" ? "the coin says… reveal" : "the coin says… stays secret"}
      </p>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const flipping = useCoinFlip();

  const isRecipient = Boolean(item && item.visible_to !== null);
  const isPublic = Boolean(item && item.visible_to === null);
  const done = round?.phase === "done";

  async function broadcastFlip(landing: "reveal" | "secret") {
    const supabase = getSupabase();
    if (!supabase || !round || !me) return;
    await supabase.from("round_events").insert({
      round_id: round.id,
      idx: 0,
      player_id: me.id,
      kind: "coin_flip",
      value: landing,
    });
  }

  async function doReveal() {
    if (!round) return;
    await broadcastFlip("reveal");
    await new Promise((r) => setTimeout(r, FLIP_MS));
    await call("reveal_item", { p_round: round.id, p_idx: 0 });
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
  }

  async function doSecret() {
    if (!round) return;
    await broadcastFlip("secret");
    await new Promise((r) => setTimeout(r, FLIP_MS));
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  if (!round) {
    return (
      <GameShell icon="🔒" title="Paranoia">
        <ParStyle />
        <Vignette />
        <WaitingOnHost label="Someone's about to be asked something…" />
      </GameShell>
    );
  }

  return (
    <GameShell
      icon="🔒"
      title="Paranoia"
      dock={
        isHost && !flipping && round.phase !== "reveal" && round.phase !== "done" ? (
          <div className="flex gap-2 pt-3">
            <GhostButton onClick={() => void doSecret()}>Flip: stays secret</GhostButton>
            <PrimaryButton onClick={() => void doReveal()}>Flip: reveal it</PrimaryButton>
          </div>
        ) : undefined
      }
    >
      <ParStyle />
      <Vignette />

      {flipping ? (
        <CoinFlip landing={flipping} />
      ) : isRecipient ? (
        <div className="rise flex flex-col items-center gap-5 py-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-flame">
            you&apos;ve been asked
          </p>
          <p
            className="max-w-xs text-2xl font-black leading-snug"
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.18)" }}
          >
            {item?.content}
          </p>
          <p className="mt-2 max-w-[240px] text-xs text-mute">
            Say only your answer out loud — a name. Don&apos;t repeat the
            question.
          </p>
        </div>
      ) : isPublic ? (
        <div className="rise flex flex-col items-center gap-5 py-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">
            the question was
          </p>
          <p
            className="max-w-xs text-2xl font-black leading-snug"
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.18)" }}
          >
            {item?.content}
          </p>
        </div>
      ) : done ? (
        <div className="rise flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-2xl">🔒</span>
          <p className="text-sm text-mute">
            That one stayed sealed. Nobody will ever know what was asked.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-flame" />
          <p className="max-w-[220px] text-sm text-mute">
            Someone&apos;s been asked something. Watch their face.
          </p>
        </div>
      )}
    </GameShell>
  );
}

/**
 * TV: the coin, and nothing else.
 *
 * Deliberately the only board in the app with no leaderboard rail
 * (`rail={false}`) — this round is five seconds of everyone staring at
 * one person's face, and a scoreboard in the corner would undercut it.
 * The screen holds the tension while the question is private, plays the
 * SAME coin flip every phone is playing (useCoinFlip, off the shared
 * round_events row — so the TV lands on the same frame as the room
 * rather than running its own animation), and then either shows the
 * question at full size or says, permanently, that it never will.
 *
 * The private question can't reach here early for the same structural
 * reason as Chameleon's word: /tv claims no profile, so `my_player_id()`
 * is null and round_items' RLS only ever hands this client rows with
 * `visible_to is null`. reveal_item() nulling that column IS the reveal.
 */
function Tv({ round }: GameViewProps) {
  const { items } = useRoom();
  const flipping = useCoinFlip();
  // Only ever the public row — a privately-dealt question is invisible to
  // this client at the database level, not filtered out here.
  const item = items.find((i) => i.idx === 0 && i.visible_to === null);
  const done = round.phase === "done";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-10">
      <ParStyle />
      <Vignette />

      {flipping ? (
        <div className="flex flex-col items-center gap-8">
          <div
            className="par-coin grid h-56 w-56 place-items-center rounded-full border-4 text-8xl"
            style={{
              borderColor: "var(--color-gold)",
              background:
                "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--color-gold) 60%, white), var(--color-ink-3))",
            }}
          >
            {flipping === "reveal" ? "👁️" : "🔒"}
          </div>
          <p className="text-2xl font-black uppercase tracking-[0.3em] text-mute">
            {flipping === "reveal" ? "the coin says… reveal" : "the coin says… stays secret"}
          </p>
        </div>
      ) : item ? (
        <div className="rise flex max-w-4xl flex-col items-center gap-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.4em] text-gold">
            the question was
          </p>
          <p
            className="text-6xl font-black leading-tight"
            style={{ textShadow: "0 0 60px rgba(255,255,255,0.2)" }}
          >
            {item.content}
          </p>
        </div>
      ) : done ? (
        <div className="rise flex flex-col items-center gap-6 text-center">
          <span className="text-7xl">🔒</span>
          <p className="max-w-xl text-3xl font-bold text-mute">
            That one stayed sealed. Nobody will ever know what was asked.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-3 w-3 animate-pulse rounded-full bg-flame" />
          <p className="max-w-2xl text-4xl font-black leading-snug">
            Someone&apos;s been asked something.
          </p>
          <p className="text-2xl text-mute">Watch their face.</p>
        </div>
      )}
    </main>
  );
}

export const paranoia: GameModule = {
  id: "paranoia",
  title: "Paranoia",
  hall: "vault",
  icon: "🔒",
  blurb: "One phone gets the question. Only a coin flip decides if it's ever shared.",
  source: { kind: "deck" },
  minutes: 5,
  async start({ call, roster }) {
    const eligible = roster.filter((p) => p.claimed_by);
    if (eligible.length === 0) {
      throw new Error("nobody has claimed a profile yet");
    }
    const target = eligible[Math.floor(Math.random() * eligible.length)];
    const question =
      PARANOIA_QUESTIONS[Math.floor(Math.random() * PARANOIA_QUESTIONS.length)];

    const roundId = (await call("start_deck_round", {
      p_game: "paranoia",
      p_hall: "vault",
    })) as string;

    await call("deal_private", {
      p_round: roundId,
      p_idx: 0,
      p_to: target.id,
      p_content: question,
      p_answer: null,
    });
  },
  PhoneView: Phone,
  TvView: Tv,
};
