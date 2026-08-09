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
import { CREW } from "@/config/crew";
import { Hub } from "@/components/Hub";
import { ClaimScreen } from "@/components/ClaimScreen";
import { Survey } from "@/components/survey/Survey";

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

export default function PreviewPage() {
  const [view, setView] = useState<"hub" | "claim" | "survey">("hub");

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

  return (
    <PlayerContext.Provider value={ctx}>
      <div
        data-preview-toggle
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-ink-2/95 p-1 backdrop-blur"
      >
        {(["hub", "claim", "survey"] as const).map((v) => (
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
      {view === "hub" && <Hub />}
      {view === "claim" && <ClaimScreen />}
      {view === "survey" && <Survey />}
    </PlayerContext.Provider>
  );
}
