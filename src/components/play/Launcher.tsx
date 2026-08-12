"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { GAMES, HALL_LABEL, HALL_BLURB } from "@/games/registry";
import type { GameModule, Hall } from "@/lib/game/types";
import { EVENT } from "@/config/event";
import { EVIDENCE_PROMPTS } from "@/config/decks";
import { Leaderboard } from "./Leaderboard";

const HALLS: Hall[] = ["huddle", "arena", "vault"];

/**
 * The host's game picker. Everyone else sees the leaderboard and waits —
 * PLAN.md is explicit that any hall can be launched at any moment, so this
 * is deliberately a flat grid, not a forced running order. The Arena greys
 * out without a TV so nobody starts a game the room can't actually play,
 * and the Vault only ever renders here once PlayGate has already confirmed
 * the day is unlocked (start_round enforces this server-side too).
 */
export function Launcher() {
  const { roster } = usePlayer();
  const { isHost, tvConnected, call } = useRoom();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);

  async function startEvidence() {
    const start = new Date();
    const end = new Date(EVENT.unlocksAt.getTime() + 7 * 60 * 60 * 1000);
    const made = await call("schedule_evidence", {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_per_player: 3,
      p_prompts: EVIDENCE_PROMPTS,
    });
    setScheduled(true);
    void made;
  }

  async function launch(game: GameModule) {
    setError(null);
    setStarting(game.id);
    try {
      await game.start({ call, roster });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start that one.");
    } finally {
      setStarting(null);
    }
  }

  if (!isHost) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 pad-safe-t pad-safe-b text-center">
        <div className="h-2 w-2 animate-pulse rounded-full bg-flame" />
        <p className="text-sm text-mute">Waiting on the host to launch something.</p>
        <div className="w-full pt-4">
          <Leaderboard />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 pad-safe-t pb-24">
      <header className="rise flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          You&apos;re hosting
        </p>
      </header>

      <div className="rise mt-4" style={{ animationDelay: "40ms" }}>
        <Leaderboard compact />
      </div>

      {error && (
        <p className="rise mt-4 rounded-2xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm text-flame">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void startEvidence()}
        className="rise mt-4 flex w-full items-center justify-between rounded-2xl border border-dashed border-line px-4 py-3 text-left active:scale-[0.98]"
        style={{ animationDelay: "60ms" }}
      >
        <span className="text-sm font-semibold">
          📸 {scheduled ? "Evidence is running" : "Start Evidence for the day"}
        </span>
        <span className="text-xs text-mute">
          {scheduled ? "everyone's got 3 prompts" : "one tap, all day"}
        </span>
      </button>

      {HALLS.map((hall, hi) => {
        const games = GAMES.filter((g) => g.hall === hall);
        const blocked = hall === "arena" && !tvConnected;
        return (
          <section key={hall} className="rise mt-8" style={{ animationDelay: `${80 + hi * 40}ms` }}>
            <h2 className="text-sm font-black tracking-tight">{HALL_LABEL[hall]}</h2>
            <p className="mt-0.5 text-xs text-mute">{HALL_BLURB[hall]}</p>
            {blocked && (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-gold">
                connect the TV at /tv first
              </p>
            )}
            <div className="mt-3 space-y-2">
              {games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={blocked || starting !== null}
                  onClick={() => void launch(g)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40"
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">
                      {starting === g.id ? "Dealing…" : g.title}
                    </span>
                    <span className="block truncate text-xs text-mute">{g.blurb}</span>
                  </span>
                  {g.minutes && (
                    <span className="shrink-0 text-[11px] font-semibold text-mute">
                      ~{g.minutes}m
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
