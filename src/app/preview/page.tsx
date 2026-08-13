"use client";

/**
 * Design preview — renders the real components against mock data so the UI
 * can be reviewed without a Supabase project attached.
 *
 * Deliberately kept in the repo: it's how you check a copy or layout change
 * on a phone in ten seconds. It writes nothing and reads nothing.
 */

import { useState } from "react";
import { PlayerContext, type PlayerCtx, type PlayerRow } from "@/lib/player";
import { RoomContext, type RoomCtx } from "@/lib/game/room";
import type { Round, RoundItem } from "@/lib/game/types";
import { CREW } from "@/config/crew";
import { Hub } from "@/components/Hub";
import { ClaimScreen } from "@/components/ClaimScreen";
import { Survey } from "@/components/survey/Survey";
import { Launcher } from "@/components/play/Launcher";
import { truthOrDare } from "@/games/vault/truth-or-dare";

const mockRoster: PlayerRow[] = CREW.map((c, i) => ({
  id: c.id,
  name: c.name,
  emoji: c.emoji,
  color: c.color,
  hype_word: null,
  trash_talk: null,
  claimed_by: i < 4 ? `uid-${i}` : null,
  answers_count: [23, 41, 0, 12, 0, 7][i] ?? 0,
  submitted_at: null,
  sort_order: i,
}));

const noop = async () => {};

/** Enough points to make the leaderboard look lived-in, not a fresh table. */
const mockLeaderboard = mockRoster
  .map((p, i) => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, points: [640, 520, 480, 310, 150, 0][i] ?? 0 }))
  .sort((a, b) => b.points - a.points);

/** A mid-round Truth or Dare, reckless tier — exercises GameShell's header,
 *  the rules affordance, and the escalated deck content all in one shot. */
const mockRound: Round = {
  id: "mock-round",
  game: "truth_or_dare",
  hall: "vault",
  phase: "play",
  subject: null,
  config: {},
  item_cursor: 2,
  show_submissions: false,
  show_votes: false,
  started_at: new Date().toISOString(),
  is_test: true,
  created_at: new Date().toISOString(),
  ended_at: null,
};
const mockItems: RoundItem[] = [
  { id: "i0", round_id: "mock-round", idx: 0, kind: "deck", content: "warm truth", visible_to: null, meta: { kind: "truth", tier: "warm" } },
  { id: "i1", round_id: "mock-round", idx: 1, kind: "deck", content: "warm dare", visible_to: null, meta: { kind: "dare", tier: "warm" } },
  {
    id: "i2",
    round_id: "mock-round",
    idx: 2,
    kind: "deck",
    content: "Name the person in this room you'd most likely fall for in a different life, and give one real reason.",
    visible_to: null,
    meta: { kind: "truth", tier: "reckless" },
  },
];

export default function PreviewPage() {
  const [view, setView] = useState<"hub" | "claim" | "survey" | "play" | "game">("hub");
  const [asHost, setAsHost] = useState(true);
  const [tvConnected, setTvConnected] = useState(false);

  const ctx: PlayerCtx = {
    roster: mockRoster,
    // The claim screen is the only view that renders *because* nobody's set.
    me: view === "claim" ? null : mockRoster[0],
    uid: "uid-0",
    loading: false,
    error: null,
    configured: true,
    claim: async () => true,
    release: noop,
    updateMe: noop,
    refresh: noop,
  };

  // Stage 2's picker (Launcher) reads room state via useRoom(), which needs
  // a real Supabase project by default — this mock is what lets /preview
  // review the tab bar and tiles without one, same reasoning PlayerContext
  // gets mocked above it. round stays null: Launcher itself doesn't read
  // it, and null is what "no active round, show the picker" looks like.
  const roomCtx: RoomCtx = {
    room: { id: "commutation", host_player: "choolwe", unlocked_at: new Date().toISOString(), active_round: null, tv_seen_at: null },
    round: view === "game" ? mockRound : null,
    items: view === "game" ? mockItems : [],
    secrets: [],
    submissions: [],
    votes: [],
    events: [],
    leaderboard: mockLeaderboard,
    loading: false,
    isHost: asHost,
    unlocked: true,
    tvConnected,
    refresh: noop,
    call: async () => null,
  };

  return (
    <PlayerContext.Provider value={ctx}>
      <RoomContext.Provider value={roomCtx}>
        <div
          data-preview-toggle
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          {view === "play" && (
            <div className="flex gap-1 rounded-full border border-line bg-ink-2/95 p-1 backdrop-blur">
              <button
                onClick={() => setAsHost((v) => !v)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${asHost ? "bg-flame text-ink" : "text-mute"}`}
              >
                {asHost ? "host" : "guest"}
              </button>
              <button
                onClick={() => setTvConnected((v) => !v)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${tvConnected ? "bg-flame text-ink" : "text-mute"}`}
              >
                tv {tvConnected ? "on" : "off"}
              </button>
            </div>
          )}
          <div className="rounded-full border border-line bg-ink-2/95 p-1 backdrop-blur">
            {(["hub", "claim", "survey", "play", "game"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-2 text-xs font-bold ${
                  view === v ? "bg-flame text-ink" : "text-mute"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {view === "hub" && <Hub />}
        {view === "claim" && <ClaimScreen />}
        {view === "survey" && <Survey />}
        {view === "play" && <Launcher />}
        {view === "game" && <truthOrDare.PhoneView round={mockRound} />}
      </RoomContext.Provider>
    </PlayerContext.Provider>
  );
}
