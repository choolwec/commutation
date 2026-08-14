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
import type { Round, RoundItem, Submission, Vote, RoundSecret } from "@/lib/game/types";
import { CREW } from "@/config/crew";
import { Hub } from "@/components/Hub";
import { ClaimScreen } from "@/components/ClaimScreen";
import { Survey } from "@/components/survey/Survey";
import { Launcher } from "@/components/play/Launcher";
import { truthOrDare } from "@/games/vault/truth-or-dare";
import { clapCircle } from "@/games/huddle/clap-circle";
import { drawful } from "@/games/arena/drawful";
import { ExitContext } from "@/components/play/ExitContext";

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
const noopSync = () => {};

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

/** Clap Circle mid-round: the ring, the pointer, two people already out.
 *  Deals no round_items at all, so config IS the whole game state — which
 *  makes it the cheapest of the group's rounds to mock and the best check
 *  that SeatRing lays six faces out sensibly at phone width. */
const mockCircleRound: Round = {
  id: "mock-circle",
  game: "clap_circle",
  hall: "huddle",
  phase: "play",
  subject: null,
  config: { at: 3, dir: -1, out: ["joy", "niza"] },
  item_cursor: 0,
  show_submissions: false,
  show_votes: false,
  started_at: new Date().toISOString(),
  is_test: true,
  created_at: new Date().toISOString(),
  ended_at: null,
};

// A placeholder squiggle, standing in for a real canvas.toDataURL() JPEG —
// Drawful's TvView (the first bespoke one, see HANDOFF §12/"before Saturday")
// only cares that `.value` is an image src, so an inline SVG data URI is
// enough to check layout without a real drawn stroke.
const MOCK_DRAWING =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="#f4f1ea"/><path d="M20 180 C 80 40, 140 200, 200 60 S 280 20 300 100" stroke="#ff5c39" stroke-width="10" fill="none" stroke-linecap="round"/></svg>',
  );

/** Turn 2 of 4, mid-Drawful — enough distinct idx values on `items` for the
 *  turn counter, none of it readable by the TV (private items filter on
 *  `visible_to` in the real app; here it's just four rows for the Set to
 *  count). Phase is driven by the tv/tv-phase toggle below. */
const mockDrawfulRound = (phase: Round["phase"]): Round => ({
  id: "mock-drawful",
  game: "drawful",
  hall: "arena",
  phase,
  subject: null,
  config: {},
  item_cursor: 1,
  show_submissions: phase !== "play",
  show_votes: phase === "reveal" || phase === "done",
  started_at: new Date().toISOString(),
  is_test: true,
  created_at: new Date().toISOString(),
  ended_at: null,
});
const mockDrawfulItems: RoundItem[] = [0, 1, 2, 3].map((idx) => ({
  id: `di-${idx}`,
  round_id: "mock-drawful",
  idx,
  kind: "role",
  content: "prompt (private)",
  visible_to: mockRoster[idx % mockRoster.length].id,
  meta: {},
}));
const mockDrawfulSubmissions: Submission[] = [
  { id: "s-draw", round_id: "mock-drawful", player_id: mockRoster[3].id, idx: 1, kind: "drawing", value: MOCK_DRAWING, created_at: new Date().toISOString() },
  { id: "s-truth", round_id: "mock-drawful", player_id: "", idx: 1, kind: "lie", value: "A flamingo doing its taxes", created_at: new Date().toISOString() },
  { id: "s-2", round_id: "mock-drawful", player_id: mockRoster[0].id, idx: 1, kind: "lie", value: "My mum's Sunday hat", created_at: new Date().toISOString() },
  { id: "s-3", round_id: "mock-drawful", player_id: mockRoster[1].id, idx: 1, kind: "lie", value: "The WiFi router, mid-argument", created_at: new Date().toISOString() },
];
const mockDrawfulVotes: Vote[] = [
  { id: "v-1", round_id: "mock-drawful", player_id: mockRoster[0].id, idx: 1, value: "s-truth", created_at: new Date().toISOString() },
  { id: "v-2", round_id: "mock-drawful", player_id: mockRoster[1].id, idx: 1, value: "s-2", created_at: new Date().toISOString() },
  { id: "v-3", round_id: "mock-drawful", player_id: mockRoster[4].id, idx: 1, value: "s-truth", created_at: new Date().toISOString() },
];
const mockDrawfulSecrets: RoundSecret[] = [
  { id: "sec-1", round_id: "mock-drawful", item_id: null, idx: 1, author: null, payload: { truth_submission: "s-truth" } },
];

export default function PreviewPage() {
  const [view, setView] = useState<
    "hub" | "claim" | "survey" | "play" | "game" | "circle" | "tv"
  >("hub");
  const [asHost, setAsHost] = useState(true);
  const [tvConnected, setTvConnected] = useState(false);
  const [tvPhase, setTvPhase] = useState<Round["phase"]>("reveal");

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
    round:
      view === "game"
        ? mockRound
        : view === "circle"
          ? mockCircleRound
          : view === "tv"
            ? mockDrawfulRound(tvPhase)
            : null,
    items: view === "game" ? mockItems : view === "tv" ? mockDrawfulItems : [],
    secrets: view === "tv" ? mockDrawfulSecrets : [],
    submissions: view === "tv" ? mockDrawfulSubmissions : [],
    votes: view === "tv" ? mockDrawfulVotes : [],
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
          {view === "tv" && (
            <div className="flex gap-1 rounded-full border border-line bg-ink-2/95 p-1 backdrop-blur">
              {(
                [
                  ["play", "drawing"],
                  ["vote", "titling"],
                  ["reveal", "reveal"],
                ] as const
              ).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => setTvPhase(p)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${tvPhase === p ? "bg-flame text-ink" : "text-mute"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-full border border-line bg-ink-2/95 p-1 backdrop-blur">
            {(["hub", "claim", "survey", "play", "game", "circle", "tv"] as const).map((v) => (
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
        {/* The exit affordance in GameShell only offers "back to the games
            list" when something above it can actually do that — PlayRoom and
            TestRoom provide it, /tv doesn't. Mocked here so the sheet renders
            with both options in a shot. */}
        <ExitContext.Provider value={{ leave: noopSync }}>
          {view === "game" && <truthOrDare.PhoneView round={mockRound} />}
          {view === "circle" && <clapCircle.PhoneView round={mockCircleRound} />}
        </ExitContext.Provider>
        {/* /tv skips <Gate> and ExitContext entirely in the real app (no
            exit affordance there by design — see HANDOFF §15's documented
            exception), so it's mocked outside both. */}
        {view === "tv" && drawful.TvView && <drawful.TvView round={mockDrawfulRound(tvPhase)} />}
      </RoomContext.Provider>
    </PlayerContext.Provider>
  );
}
