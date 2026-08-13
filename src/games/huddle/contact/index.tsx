"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule } from "@/lib/game/types";
import { GameShell, GhostButton, PrimaryButton } from "@/components/play/GameShell";
import { Face, useSeats, pickN } from "@/games/common";
import { CONTACT_WORDS } from "@/config/their-rounds";

/**
 * CONTACT — the letter-reveal word game (THEIR_ROUNDS §2.3).
 *
 * What was described in the survey matched the classic party game near
 * rule-for-rule, so this is built as Contact rather than as a new thing:
 * the holder reveals one letter at a time; a guesser who thinks they know
 * the word gives a CLUE (never the word) to signal someone else; if a
 * second guesser reads the same word out of that clue, the two of them
 * count down and say it together; the holder can block by naming the word
 * being signalled before the count finishes.
 *
 * Scope, as the spec itself recommended if time was short: the app owns the
 * letter tracker and the contact/block race, and the clue-giving and social
 * deduction run verbally, exactly as the group already plays it. That's most
 * of the feel for a fraction of the work, and the half that's built is the
 * half a room genuinely can't do in its head — who signalled first.
 *
 * Two things the engine had to do properly:
 *
 *  · The word is never in the bundle or in a public row. It's sealed in
 *    round_secrets, and contact_reveal_letter (0016) copies out exactly the
 *    revealed PREFIX. Unlike Fibbage's answer key, reading this one in
 *    devtools wouldn't spoil a question — it would be the entire game — so
 *    it gets the deal_from_survey treatment, not the deck treatment.
 *
 *  · "Who got there first" is round_events (0008), server-timestamped, the
 *    same primitive Buzz In uses. Six phones disagreeing about who signalled
 *    first is exactly the failure a race needs a referee for. §2.3's Q7
 *    resolved ties to the guessing pair, not the blocker, which keeps the
 *    round moving instead of rewarding the holder for stalling — so the
 *    block only counts if it lands strictly first.
 *
 * VISUAL IDENTITY: letters coming up in lights. Revealed characters in
 * bright yellow tiles, everything still hidden as dim slots, so the shape of
 * the word is the screen.
 */

const ACCENT = "#facc15";

function LetterBoard({ prefix, length }: { prefix: string; length: number }) {
  const cells = Array.from({ length: Math.max(length, prefix.length) });
  return (
    <div className="rise flex flex-wrap justify-center gap-1.5">
      {cells.map((_, i) => {
        const ch = prefix[i];
        return (
          <div
            key={i}
            className="grid h-11 w-9 place-items-center rounded-lg border-2 text-xl font-black transition-all duration-300"
            style={
              ch
                ? {
                    borderColor: ACCENT,
                    background: `color-mix(in oklab, ${ACCENT} 22%, transparent)`,
                    color: ACCENT,
                    boxShadow: `0 0 14px color-mix(in oklab, ${ACCENT} 35%, transparent)`,
                  }
                : {
                    borderColor: "var(--color-line)",
                    background: "var(--color-ink-2)",
                    color: "var(--color-mute)",
                  }
            }
          >
            {ch ?? "·"}
          </div>
        );
      })}
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, items, events, isHost, call } = useRoom();
  const seats = useSeats();
  const [busy, setBusy] = useState(false);

  const prefixItem = items.find((i) => i.kind === "prefix");
  const myWord = items.find((i) => i.kind === "private");
  const letters = typeof round?.config?.letters === "number" ? round.config.letters : 0;
  const length = typeof round?.config?.length === "number" ? round.config.length : 0;

  // The race is scoped to the current letter — a contact signalled two
  // letters ago is long dead, so idx is the letter count, not a cursor.
  const roundEvents = useMemo(
    () =>
      events
        .filter((e) => e.idx === letters)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [events, letters],
  );
  const contacts = roundEvents.filter((e) => e.kind === "contact");
  const block = roundEvents.find((e) => e.kind === "block") ?? null;

  if (!round) return null;

  const holderId = round.subject;
  const holder = seats.find((s) => s.id === holderId);
  const iAmHolder = Boolean(me && holderId === me.id);
  const isDone = round.phase === "done";
  const iSignalled = contacts.some((e) => e.player_id === me?.id);
  const fullyOut = length > 0 && letters >= length;

  // Q7: a tie goes to the pair. The block only wins if it landed strictly
  // before the second contact — one signaller alone isn't a contact yet.
  const pairMade = contacts.length >= 2;
  const blockWins = Boolean(block && (!pairMade || block.created_at < contacts[1].created_at));

  async function post(kind: string) {
    const supabase = getSupabase();
    if (!supabase || !me || !round) return;
    await supabase
      .from("round_events")
      .insert({ round_id: round.id, idx: letters, player_id: me.id, kind });
  }

  async function award(ids: string[], points: number, reason: string) {
    if (!round) return;
    for (const id of ids) {
      await call("award_points", {
        p_player: id,
        p_points: points,
        p_reason: reason,
        p_round: round.id,
      });
    }
  }

  async function pairGotIt() {
    if (!round || busy) return;
    setBusy(true);
    try {
      await award(contacts.slice(0, 2).map((e) => e.player_id), 150, "contact_pair");
      await call("contact_reveal_letter", { p_round: round.id });
    } finally {
      setBusy(false);
    }
  }

  async function holderBlocked() {
    if (!round || busy || !holderId) return;
    setBusy(true);
    try {
      await award([holderId], 150, "contact_block");
      await call("contact_reveal_letter", { p_round: round.id });
    } finally {
      setBusy(false);
    }
  }

  async function nextLetter() {
    if (!round || busy) return;
    setBusy(true);
    try {
      await call("contact_reveal_letter", { p_round: round.id });
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!round || busy || !holderId) return;
    setBusy(true);
    try {
      // Running the word all the way out means the room never got it — the
      // holder survives, and that's worth the same as one successful block.
      if (fullyOut) await award([holderId], 150, "contact_survived");
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell
      icon="💡"
      title="Contact"
      subtitle={
        isDone
          ? "Finished"
          : `${letters} of ${length || "?"} letters out · ${holder?.name ?? "someone"} holds it`
      }
      dock={
        isHost && !isDone ? (
          <div className="space-y-2 pt-3">
            {pairMade && !blockWins && (
              <PrimaryButton
                onClick={() => void pairGotIt()}
                disabled={busy}
                style={{ background: ACCENT, color: "var(--color-ink)" }}
              >
                They said it together — 150 each, next letter →
              </PrimaryButton>
            )}
            {block && blockWins && (
              <PrimaryButton
                onClick={() => void holderBlocked()}
                disabled={busy}
                style={{ background: ACCENT, color: "var(--color-ink)" }}
              >
                Blocked in time — 150 to {holder?.name ?? "the holder"}, next letter →
              </PrimaryButton>
            )}
            <div className="flex gap-2">
              <GhostButton onClick={() => void nextLetter()} disabled={busy || fullyOut}>
                {fullyOut ? "No letters left" : "Nobody got it — next letter"}
              </GhostButton>
              <GhostButton onClick={() => void finish()} disabled={busy}>
                Finish
              </GhostButton>
            </div>
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${ACCENT}, transparent 60%)`,
          opacity: 0.1,
        }}
      />

      <LetterBoard prefix={prefixItem?.content ?? ""} length={length} />

      {iAmHolder && myWord && (
        <div
          className="rise mt-6 rounded-3xl border-2 p-5 text-center"
          style={{ borderColor: ACCENT, background: "var(--color-ink-2)" }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-mute">
            Your word — nobody else can see this
          </p>
          <p className="mt-2 text-2xl font-black tracking-[0.15em]" style={{ color: ACCENT }}>
            {myWord.content}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-mute">
            When two of them start counting down, you can block by naming the word they&apos;re
            signalling — but you have to get in first.
          </p>
        </div>
      )}

      {!iAmHolder && !isDone && (
        <div className="rise mt-6 rounded-2xl border border-line bg-ink-2 px-4 py-3">
          <p className="text-center text-xs leading-relaxed text-mute">
            Think you know it? Give the room a{" "}
            <span className="font-black text-paper">clue</span>, never the word. If someone
            reads the same word out of your clue, tap below and count down together — say it
            out loud on zero.
          </p>
        </div>
      )}

      {/* Who's chasing it, and who's holding it. Also stops the pre-first-
          contact screen being a letter row floating in an empty page. */}
      <div className="rise mt-6 flex flex-wrap justify-center gap-3">
        {seats.map((s) => {
          const signalling = contacts.some((e) => e.player_id === s.id);
          const isHolder = s.id === holderId;
          return (
            <Face
              key={s.id}
              seat={s}
              size={38}
              ring={isHolder ? ACCENT : signalling ? "var(--color-flame)" : undefined}
              label={isHolder ? "holds it" : signalling ? "signalling" : s.name}
            />
          );
        })}
      </div>

      {!isDone && (
        <div className="rise mt-5 space-y-2">
          {!iAmHolder && (
            <PrimaryButton
              onClick={() => void post("contact")}
              disabled={iSignalled}
              style={{ background: ACCENT, color: "var(--color-ink)" }}
            >
              {iSignalled ? "You're signalling…" : "I've got a contact"}
            </PrimaryButton>
          )}
          {iAmHolder && (
            <PrimaryButton
              onClick={() => void post("block")}
              disabled={Boolean(block)}
              style={{ background: ACCENT, color: "var(--color-ink)" }}
            >
              {block ? "Block called" : "BLOCK — I know what they mean"}
            </PrimaryButton>
          )}
        </div>
      )}

      {roundEvents.length > 0 && (
        <div className="rise mt-5 space-y-1.5">
          {roundEvents.map((e, i) => {
            const seat = seats.find((s) => s.id === e.player_id);
            const isBlock = e.kind === "block";
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                style={{
                  borderColor: isBlock ? "var(--color-flame)" : ACCENT,
                  background: `color-mix(in oklab, ${isBlock ? "var(--color-flame)" : ACCENT} 10%, transparent)`,
                }}
              >
                <span className="w-4 text-mute">{i + 1}</span>
                <span>{seat?.emoji ?? "👤"}</span>
                <span className="flex-1 font-bold">{seat?.name}</span>
                <span className="font-semibold text-mute">
                  {isBlock ? "blocked" : "has a contact"}
                </span>
              </div>
            );
          })}
          {pairMade && !blockWins && (
            <p className="pt-1 text-center text-xs font-bold" style={{ color: ACCENT }}>
              Contact made — 3, 2, 1, say it.
            </p>
          )}
          {blockWins && (
            <p className="pt-1 text-center text-xs font-bold text-flame">
              Blocked first — the holder gets it.
            </p>
          )}
        </div>
      )}

      {isDone && (
        <p className="rise mt-6 text-center text-sm text-mute">
          {fullyOut
            ? "The word ran all the way out — the holder survived."
            : "Round over."}
        </p>
      )}
    </GameShell>
  );
}

export const contact: GameModule = {
  id: "contact",
  title: "Contact",
  hall: "huddle",
  icon: "💡",
  blurb: "One letter at a time. Clue someone into the word without saying it.",
  source: { kind: "private" },
  origin: "group",
  minutes: 15,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 3) throw new Error("this one needs at least three people");

    const holder = playing[Math.floor(Math.random() * playing.length)];
    const word = pickN(CONTACT_WORDS, 1)[0];

    const roundId = (await call("start_deck_round", {
      p_game: "contact",
      p_hall: "huddle",
      p_subject: holder.id,
      p_config: { letters: 0, length: word.length },
    })) as string;

    // The word goes in sealed. Only its prefix ever becomes public, and only
    // through contact_reveal_letter — see 0016's header.
    await call("deal_private", {
      p_round: roundId,
      p_idx: 0,
      p_to: holder.id,
      p_content: word,
      p_answer: word,
    });

    // Opens on the first letter, which is the game's actual starting state.
    await call("contact_reveal_letter", { p_round: roundId });
  },
  PhoneView: Phone,
};
