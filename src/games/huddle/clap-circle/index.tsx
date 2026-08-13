"use client";

import { useState } from "react";
import { useRoom } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, GhostButton, PrimaryButton } from "@/components/play/GameShell";
import { SeatRing, useSeats, finishPoints, type Seat } from "@/games/common";

/**
 * CLAP CIRCLE — one clap passes it on, two send it back, three skip the
 * next person. Clap out of turn or miss your turn and you're out; last one
 * standing takes it (THEIR_ROUNDS §3.2).
 *
 * The rules arrived fully formed and needed no design work at all, so this
 * module deliberately does almost nothing: it holds the pointer and the
 * ledger, and a human calls the bad claps. Never try to detect a clap with
 * a microphone — that was in the spec and it's right; the argument about
 * whether that was a clap is half the game.
 *
 * All the state is three fields in rounds.config (`at`, `dir`, `out`),
 * written by the host through set_round_config (0015) and read by everyone.
 * There is no alive/dead table anywhere — elimination ORDER is the score,
 * paid at the moment someone goes out, exactly as THEIR_ROUNDS §0 concluded.
 *
 * VISUAL IDENTITY: the ring itself. Six faces laid out as an actual circle
 * with the live pointer glowing amber and a direction arrow in the middle —
 * on a phone held flat in the middle of a real circle, that reads instantly.
 */

const ACCENT = "#f59e0b";

type Config = { at: number; dir: 1 | -1; out: string[] };

function readConfig(raw: Record<string, unknown> | undefined): Config {
  const at = typeof raw?.at === "number" ? raw.at : 0;
  const dir = raw?.dir === -1 ? -1 : 1;
  const out = Array.isArray(raw?.out) ? (raw.out as string[]) : [];
  return { at, dir, out };
}

/** Next seat in `dir`, skipping anyone already out. `step` of 2 is a skip. */
function advance(seats: Seat[], cfg: Config, step: number): number {
  const gone = new Set(cfg.out);
  const n = seats.length;
  if (n === 0 || gone.size >= n) return cfg.at;
  let i = cfg.at;
  let moved = 0;
  // Bounded by n*step so a ring of all-but-one eliminated can't spin here.
  for (let guard = 0; guard < n * Math.max(step, 1) + n && moved < step; guard++) {
    i = (i + cfg.dir + n) % n;
    if (!gone.has(seats[i].id)) moved++;
  }
  return i;
}

function DirectionDial({ dir, name }: { dir: 1 | -1; name: string }) {
  return (
    <div className="text-center">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl transition-transform duration-300"
        style={{
          background: `color-mix(in oklab, ${ACCENT} 22%, transparent)`,
          border: `2px solid ${ACCENT}`,
          transform: dir === 1 ? "rotate(0deg)" : "rotate(180deg)",
        }}
      >
        ↻
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-mute">
        {dir === 1 ? "clockwise" : "anticlockwise"}
      </p>
      <p className="mt-1 max-w-[110px] truncate text-sm font-black">{name}</p>
    </div>
  );
}

function Phone() {
  const { round, isHost, call } = useRoom();
  const seats = useSeats();
  const [busy, setBusy] = useState(false);

  const cfg = readConfig(round?.config);
  const gone = new Set(cfg.out);
  const standing = seats.filter((s) => !gone.has(s.id));
  const active = seats[cfg.at];
  const isDone = round?.phase === "done";

  async function patch(next: Partial<Config>) {
    if (!round || busy) return;
    setBusy(true);
    try {
      await call("set_round_config", { p_round: round.id, p_patch: next });
    } finally {
      setBusy(false);
    }
  }

  async function clap(step: number, flip: boolean) {
    const dir: 1 | -1 = flip ? ((cfg.dir * -1) as 1 | -1) : cfg.dir;
    await patch({ dir, at: advance(seats, { ...cfg, dir }, step) });
  }

  async function knockOut(id: string) {
    if (!round || busy) return;
    const place = cfg.out.length;
    const nextOut = [...cfg.out, id];
    setBusy(true);
    try {
      await call("award_points", {
        p_player: id,
        p_points: finishPoints(place, seats.length, false),
        p_reason: "clap_circle",
        p_round: round.id,
      });
      const cfgAfter = { ...cfg, out: nextOut };
      await call("set_round_config", {
        p_round: round.id,
        p_patch: { out: nextOut, at: advance(seats, cfgAfter, 1) },
      });
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!round || busy) return;
    setBusy(true);
    try {
      const last = standing[0];
      if (last) {
        await call("award_points", {
          p_player: last.id,
          p_points: finishPoints(cfg.out.length, seats.length, false),
          p_reason: "clap_circle_winner",
          p_round: round.id,
        });
      }
      await call("set_phase", { p_round: round.id, p_phase: "done" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell
      icon="👏"
      title="Clap Circle"
      subtitle={isDone ? "Finished" : `${standing.length} still in`}
      dock={
        isHost && !isDone ? (
          <div className="space-y-2 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <GhostButton onClick={() => void clap(1, false)} disabled={busy}>
                👏<span className="ml-1 text-[11px]">carry on</span>
              </GhostButton>
              <GhostButton onClick={() => void clap(1, true)} disabled={busy}>
                👏👏<span className="ml-1 text-[11px]">reverse</span>
              </GhostButton>
              <GhostButton onClick={() => void clap(2, false)} disabled={busy}>
                👏👏👏<span className="ml-1 text-[11px]">skip</span>
              </GhostButton>
            </div>
            {standing.length <= 1 && (
              <PrimaryButton
                onClick={() => void finish()}
                disabled={busy}
                style={{ background: ACCENT, color: "var(--color-ink)" }}
              >
                {standing[0]?.name ?? "Nobody"} survives — finish round
              </PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${ACCENT}, transparent 55%)`,
          opacity: 0.12,
        }}
      />

      <SeatRing seats={seats} activeId={active?.id} outIds={cfg.out} accent={ACCENT}>
        <DirectionDial dir={cfg.dir} name={active?.name ?? "—"} />
      </SeatRing>

      {!isDone && (
        <div className="rise mt-2 rounded-2xl border border-line bg-ink-2 px-4 py-3">
          <p className="text-center text-xs leading-relaxed text-mute">
            <span className="font-black text-paper">One clap</span> keeps it going the way the
            arrow points. <span className="font-black text-paper">Two</span> sends it back.{" "}
            <span className="font-black text-paper">Three</span> skips whoever&apos;s next.
            Clap out of turn, or miss yours, and you&apos;re out.
          </p>
        </div>
      )}

      {isHost && !isDone && (
        <div className="rise mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">
            Tap whoever just blew it
          </p>
          <div className="grid grid-cols-3 gap-2">
            {standing.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => void knockOut(s.id)}
                className="flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition active:scale-95 disabled:opacity-40"
                style={{
                  borderColor: `color-mix(in oklab, ${ACCENT} 40%, var(--color-line))`,
                  background: `color-mix(in oklab, ${ACCENT} 8%, var(--color-ink-2))`,
                }}
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="truncate text-[11px] font-bold">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cfg.out.length > 0 && (
        <div className="rise mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">
            Out, in order
          </p>
          <ol className="space-y-1">
            {cfg.out.map((id, i) => {
              const seat = seats.find((s) => s.id === id);
              if (!seat) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-1.5 text-xs"
                >
                  <span className="w-4 text-mute">{i + 1}</span>
                  <span>{seat.emoji}</span>
                  <span className="flex-1 font-semibold">{seat.name}</span>
                  <span className="font-bold text-mute">
                    +{finishPoints(i, seats.length, false)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {!isHost && !isDone && (
        <p className="mt-6 text-center text-xs text-mute">
          Watch the ring, not your phone. The host is driving the pointer.
        </p>
      )}
    </GameShell>
  );
}

export const clapCircle: GameModule = {
  id: "clap_circle",
  title: "Clap Circle",
  hall: "huddle",
  icon: "👏",
  blurb: "One clap passes, two reverses, three skips. Miss yours and you're out.",
  source: { kind: "none" },
  origin: "group",
  minutes: 10,
  async start({ call, roster }) {
    const playing = roster.filter((p) => p.claimed_by);
    if (playing.length < 3) throw new Error("this one needs at least three people");

    await call("start_deck_round", {
      p_game: "clap_circle",
      p_hall: "huddle",
      p_config: { at: Math.floor(Math.random() * playing.length), dir: 1, out: [] },
    });
  },
  PhoneView: Phone,
};
