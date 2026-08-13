"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { GAMES, HALL_LABEL, HALL_BLURB } from "@/games/registry";
import type { GameModule, Hall } from "@/lib/game/types";
import { EVENT } from "@/config/event";
import { EVIDENCE_PROMPTS } from "@/config/decks";
import { TILE_ACCENT, TileMotif } from "@/games/tileArt";
import { BackToHub } from "@/components/BackToHub";
import { Leaderboard } from "./Leaderboard";

type Tab = Hall | "leaderboard";
const TABS: Tab[] = ["huddle", "arena", "vault", "leaderboard"];

const TAB_ICON: Record<Tab, string> = {
  huddle: "📱",
  arena: "📺",
  vault: "🔒",
  leaderboard: "🏆",
};
const TAB_LABEL: Record<Tab, string> = {
  huddle: "Huddle",
  arena: "Arena",
  vault: "Vault",
  leaderboard: "Board",
};

/**
 * One tile. Every game module's header comment already documents a real
 * "VISUAL IDENTITY" (see tileArt.tsx) — this is that design work finally
 * reaching the picker, instead of every tile being an emoji and two lines.
 */
function GameTile({
  game,
  disabled,
  dealing,
  onLaunch,
}: {
  game: GameModule;
  disabled: boolean;
  dealing: boolean;
  onLaunch: () => void;
}) {
  const accent = TILE_ACCENT[game.id] ?? "var(--color-flame)";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onLaunch}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-40"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 45%, var(--color-line))`,
        background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 16%, var(--color-ink-2)), var(--color-ink-2) 70%)`,
      }}
    >
      <TileMotif
        gameId={game.id}
        className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 opacity-[0.16]"
      />
      <span
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
        style={{ background: `color-mix(in oklab, ${accent} 30%, transparent)` }}
      >
        {game.icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-sm font-bold">{dealing ? "Dealing…" : game.title}</span>
        <span className="block truncate text-xs text-mute">{game.blurb}</span>
      </span>
      {game.minutes && (
        <span className="relative shrink-0 text-[11px] font-semibold text-mute">
          ~{game.minutes}m
        </span>
      )}
    </button>
  );
}

function HallSection({
  hall,
  starting,
  canLaunch,
  onLaunch,
}: {
  hall: Hall;
  starting: string | null;
  canLaunch: boolean;
  onLaunch: (g: GameModule) => void;
}) {
  const { tvConnected } = useRoom();
  const games = GAMES.filter((g) => g.hall === hall);
  const house = games.filter((g) => g.origin !== "group");
  const theirs = games.filter((g) => g.origin === "group");
  const blocked = hall === "arena" && !tvConnected;

  const tiles = (list: GameModule[]) =>
    list.map((g) => (
      <GameTile
        key={g.id}
        game={g}
        disabled={!canLaunch || blocked || starting !== null}
        dealing={starting === g.id}
        onLaunch={() => onLaunch(g)}
      />
    ));

  return (
    <section className="rise">
      <h2 className="text-sm font-black tracking-tight">{HALL_LABEL[hall]}</h2>
      <p className="mt-0.5 text-xs text-mute">{HALL_BLURB[hall]}</p>
      {blocked && (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-gold">
          connect the TV at /tv first
        </p>
      )}
      {!canLaunch && (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-mute">
          only the host can launch — browse away
        </p>
      )}
      <div className="mt-3 space-y-2">{tiles(house)}</div>

      {/* The rounds the group invented themselves in survey section 7. They
          get their own heading rather than being mixed in: on the day, the
          fact that a third of the schedule came out of the room is worth
          seeing. WHOSE idea each one was stays sealed — see THEIR_ROUNDS.md's
          own header for why that reveal is the payoff. */}
      {theirs.length > 0 && (
        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-black tracking-tight">🧠 Your Rounds</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
              {theirs.length} of them
            </span>
          </div>
          <p className="mt-0.5 text-xs text-mute">
            Games this room invented. Nobody&apos;s played these before.
          </p>
          <div className="mt-3 space-y-2">{tiles(theirs)}</div>
        </div>
      )}
    </section>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur"
      style={{ paddingBottom: "calc(var(--sab) + 0.375rem)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className="flex flex-col items-center gap-0.5 py-2.5 transition active:scale-95"
            >
              <span
                className="text-lg transition-transform"
                style={{ transform: isActive ? "translateY(-1px) scale(1.08)" : undefined }}
              >
                {TAB_ICON[tab]}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: isActive ? "var(--color-flame)" : "var(--color-mute)" }}
              >
                {TAB_LABEL[tab]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The game picker — a bottom tab bar (Huddle / Arena / Vault / Board),
 * reachable and browsable by everyone in the room, not just the host.
 * Only the host can actually launch a game (start_round/start_deck_round
 * enforce this server-side too — see assert_host() in 0006), but everyone
 * should be able to see what's available, see Arena greyed out without a
 * TV, and check the leaderboard without waiting on a blank screen.
 *
 * The brief's rough sketch also floated a fourth "sealed until unlock"
 * state for the Vault tab specifically — that state doesn't actually exist
 * in this engine: unlock is one global flag on game_room, not per-hall, and
 * PlayGate already blocks this whole component from rendering at all until
 * the day is unlocked. By the time anyone sees this tab bar, the Vault is
 * exactly as open as the Huddle, so it gets the same treatment.
 */
export function Launcher() {
  const { roster } = usePlayer();
  const { isHost, call } = useRoom();
  const [tab, setTab] = useState<Tab>("huddle");
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

  return (
    <main className="mx-auto max-w-md px-5 pad-safe-t pb-28">
      <header className="rise flex items-center justify-between">
        <BackToHub />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          {isHost ? "You're hosting" : "Browsing"}
        </p>
      </header>

      {error && (
        <p className="rise mt-4 rounded-2xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm text-flame">
          {error}
        </p>
      )}

      {isHost && (
        <button
          type="button"
          onClick={() => void startEvidence()}
          className="rise mt-4 flex w-full items-center justify-between rounded-2xl border border-dashed border-line px-4 py-3 text-left active:scale-[0.98]"
        >
          <span className="text-sm font-semibold">
            📸 {scheduled ? "Evidence is running" : "Start Evidence for the day"}
          </span>
          <span className="text-xs text-mute">
            {scheduled ? "everyone's got 3 prompts" : "one tap, all day"}
          </span>
        </button>
      )}

      <div className="mt-6">
        {tab === "leaderboard" ? (
          <div className="rise">
            <h2 className="mb-3 text-sm font-black tracking-tight">🏆 Leaderboard</h2>
            <Leaderboard />
          </div>
        ) : (
          <HallSection hall={tab} starting={starting} canLaunch={isHost} onLaunch={launch} />
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />
    </main>
  );
}
