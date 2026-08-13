/**
 * TILE ART — a bespoke accent color + a small inline-SVG motif per game,
 * surfaced in the Launcher. Every game module's header comment already
 * documents a real "VISUAL IDENTITY" (gold case-file for Know Me Best, a
 * dark spotlight for Paranoia, cyan/violet wash for The Deep End, and so
 * on) — this is that design work finally reaching the picker itself,
 * instead of every tile being an emoji plus two lines of text.
 *
 * Its own file, not a field on GameModule: Launcher.tsx is the only
 * consumer, and keeping it decoupled from the registry means adding art
 * for a 17th game is additive here, never a required change to the game's
 * own module. Colors are drawn from the same accent hexes each game already
 * uses internally (Drawful's GLOW, Fibbage's GLOW, etc.) where one exists,
 * so the tile matches the round it launches into rather than inventing a
 * second palette.
 *
 * Inline SVG over raster/AI art on purpose (see AUTOMODE_BRIEF.md P3): this
 * is a static export on GitHub Pages, it should stay light and dependency-
 * free.
 */
import type { ReactNode } from "react";

export const TILE_ACCENT: Record<string, string> = {
  // 🔒 Vault
  who_wrote_it: "#dc2626",
  know_me_best: "#ffc247",
  paranoia: "#7c3aed",
  the_deep_end: "#22d3ee",
  truth_or_dare: "#ff5c39",
  // 📱 Huddle
  most_likely_to: "#34d399",
  spyfall: "#ca8a04",
  chameleon: "#4ade80",
  hot_takes: "#fb923c",
  never_have_i_ever: "#a3e635",
  mafia: "#6366f1",
  // 📺 Arena
  drawful: "#f97316",
  fibbage: "#ffc247",
  best_answer: "#ec4899",
  buzz_in_trivia: "#22d3ee",
  buzz_in_music: "#a855f7",
  // 📱 Huddle — the group's own rounds (docs/THEIR_ROUNDS.md). Each matches
  // the ACCENT constant its own module renders with, same rule as above.
  act_it_out: "#e11d48",
  thirty_seconds: "#14b8a6",
  spell_it_out: "#cbd5e1",
  survey_says: "#3b82f6",
  question_volley: "#0ea5e9",
  clap_circle: "#f59e0b",
  contact: "#facc15",
  centre_stage: "#d946ef",
  speed_cards: "#059669",
};

const motifs: Record<string, ReactNode> = {
  // Redacted confession lines — a censored letter.
  who_wrote_it: (
    <>
      <rect x="18" y="14" width="64" height="10" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="32" width="44" height="10" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="50" width="54" height="10" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="18" y="68" width="30" height="10" rx="3" fill="currentColor" opacity="0.35" />
    </>
  ),
  // A case-file rubber stamp.
  know_me_best: (
    <>
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="4" strokeDasharray="6 6" opacity="0.8" fill="none" />
      <path d="M38 50l8 8 16-18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
    </>
  ),
  // A coin, edge-on, mid-flip.
  paranoia: (
    <>
      <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.15" />
      <ellipse cx="50" cy="50" rx="12" ry="30" stroke="currentColor" strokeWidth="4" opacity="0.85" fill="none" />
    </>
  ),
  // Ripples on water.
  the_deep_end: (
    <>
      <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="3" opacity="0.9" fill="none" />
      <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="3" opacity="0.6" fill="none" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="3" opacity="0.3" fill="none" />
    </>
  ),
  // A flame lick.
  truth_or_dare: (
    <path
      d="M50 18c10 14-6 18-6 30a14 14 0 1028 0c0-8-6-10-8-16 2 10-6 10-6 4 0-8-8-10-8-18z"
      fill="currentColor"
      opacity="0.85"
    />
  ),
  // An ascending bar chart.
  most_likely_to: (
    <>
      <rect x="20" y="52" width="14" height="30" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="43" y="34" width="14" height="48" rx="3" fill="currentColor" opacity="0.75" />
      <rect x="66" y="16" width="14" height="66" rx="3" fill="currentColor" opacity="0.95" />
    </>
  ),
  // A target with one dot standing apart — the odd one out.
  spyfall: (
    <>
      <circle cx="46" cy="50" r="30" stroke="currentColor" strokeWidth="4" opacity="0.5" fill="none" />
      <circle cx="46" cy="50" r="16" stroke="currentColor" strokeWidth="4" opacity="0.7" fill="none" />
      <circle cx="78" cy="26" r="7" fill="currentColor" opacity="0.95" />
    </>
  ),
  // A shifting curl of color — a chameleon's tail.
  chameleon: (
    <>
      <path
        d="M10 70 Q35 40 55 55 T95 35"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <circle cx="90" cy="30" r="5" fill="currentColor" opacity="0.9" />
    </>
  ),
  // A thermometer, mid-read.
  hot_takes: (
    <>
      <rect x="44" y="14" width="12" height="46" rx="6" stroke="currentColor" strokeWidth="4" opacity="0.85" fill="none" />
      <circle cx="50" cy="72" r="14" fill="currentColor" opacity="0.9" />
      <rect x="47" y="30" width="6" height="34" rx="3" fill="currentColor" opacity="0.7" />
    </>
  ),
  // Tally marks.
  never_have_i_ever: (
    <>
      <line x1="24" y1="20" x2="24" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <line x1="40" y1="20" x2="40" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <line x1="56" y1="20" x2="56" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <line x1="72" y1="20" x2="72" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <line x1="16" y1="70" x2="80" y2="26" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.95" />
    </>
  ),
  // A crescent moon.
  mafia: <path d="M62 20a34 34 0 100 60 28 28 0 010-60z" fill="currentColor" opacity="0.9" />,
  // A crayon squiggle.
  drawful: (
    <path
      d="M14 78C34 40 40 76 54 50S78 18 90 24"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
      opacity="0.9"
    />
  ),
  // A spotlight over a blank to fill in.
  fibbage: (
    <>
      <ellipse cx="50" cy="50" rx="40" ry="26" fill="currentColor" opacity="0.12" />
      <line x1="26" y1="66" x2="74" y2="66" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
    </>
  ),
  // A lightning bolt — matches the in-game ⚡ icon.
  best_answer: <path d="M56 14L28 56h18l-6 30 34-44H56z" fill="currentColor" opacity="0.9" />,
  // A buzzer button.
  buzz_in_trivia: (
    <>
      <circle cx="50" cy="50" r="32" fill="currentColor" opacity="0.18" />
      <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.9" />
    </>
  ),
  // A vinyl record's grooves.
  buzz_in_music: (
    <>
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="2" opacity="0.5" fill="none" />
      <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="2" opacity="0.5" fill="none" />
      <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="2" opacity="0.5" fill="none" />
      <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.9" />
    </>
  ),

  // ── the group's own rounds ────────────────────────────────────────────
  // A theatre mask, mirrored — the two halves of Opposite Day.
  act_it_out: (
    <>
      <path d="M14 26h30v28a15 15 0 01-30 0z" fill="currentColor" opacity="0.85" />
      <path d="M56 26h30v28a15 15 0 01-30 0z" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="40" r="3.5" fill="var(--color-ink)" />
      <circle cx="34" cy="40" r="3.5" fill="var(--color-ink)" />
      <circle cx="66" cy="40" r="3.5" fill="var(--color-ink)" />
      <circle cx="76" cy="40" r="3.5" fill="var(--color-ink)" />
    </>
  ),
  // A stopwatch, half elapsed.
  thirty_seconds: (
    <>
      <circle cx="50" cy="56" r="30" stroke="currentColor" strokeWidth="5" opacity="0.8" fill="none" />
      <path d="M50 56V32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
      <path d="M50 56l18 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
      <rect x="42" y="12" width="16" height="8" rx="3" fill="currentColor" opacity="0.9" />
    </>
  ),
  // Chalk letters ruled onto a slate.
  spell_it_out: (
    <>
      <line x1="16" y1="70" x2="84" y2="70" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <path d="M22 62V34h12a9 9 0 010 18H22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
      <path d="M46 62V34h16M46 48h12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M72 34v28h12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
    </>
  ),
  // A Feud board — panels flipping up, biggest answer on top.
  survey_says: (
    <>
      <rect x="14" y="18" width="72" height="16" rx="4" fill="currentColor" opacity="0.9" />
      <rect x="14" y="42" width="54" height="16" rx="4" fill="currentColor" opacity="0.6" />
      <rect x="14" y="66" width="34" height="16" rx="4" fill="currentColor" opacity="0.35" />
    </>
  ),
  // A rally — the ball crossing back and forth.
  question_volley: (
    <>
      <path d="M14 66Q50 12 86 66" stroke="currentColor" strokeWidth="5" strokeDasharray="8 7" fill="none" opacity="0.6" />
      <circle cx="14" cy="66" r="8" fill="currentColor" opacity="0.9" />
      <circle cx="86" cy="66" r="8" fill="currentColor" opacity="0.9" />
      <circle cx="50" cy="30" r="6" fill="currentColor" />
    </>
  ),
  // A clap: two hands meeting, with the impact ringing off them.
  clap_circle: (
    <>
      <path d="M40 74V38a6 6 0 0112 0v22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M52 60V34a6 6 0 0112 0v34" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M22 30l-8-8M32 20l-3-10M14 46H4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <path d="M78 30l8-8M68 20l3-10M86 46h10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  // Letter tiles, the last still dark.
  contact: (
    <>
      <rect x="10" y="36" width="24" height="28" rx="4" fill="currentColor" opacity="0.9" />
      <rect x="38" y="36" width="24" height="28" rx="4" fill="currentColor" opacity="0.55" />
      <rect x="66" y="36" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.4" />
    </>
  ),
  // A microphone caught in a spotlight cone.
  centre_stage: (
    <>
      <path d="M28 12L50 52 72 12z" fill="currentColor" opacity="0.16" />
      <rect x="42" y="30" width="16" height="30" rx="8" fill="currentColor" opacity="0.9" />
      <path d="M32 54a18 18 0 0036 0" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
      <line x1="50" y1="72" x2="50" y2="86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  // A fanned hand of cards.
  speed_cards: (
    <>
      <rect x="18" y="30" width="30" height="44" rx="5" fill="currentColor" opacity="0.35" transform="rotate(-16 33 52)" />
      <rect x="35" y="26" width="30" height="44" rx="5" fill="currentColor" opacity="0.6" />
      <rect x="52" y="30" width="30" height="44" rx="5" fill="currentColor" opacity="0.9" transform="rotate(16 67 52)" />
    </>
  ),
};

/** Renders nothing for an id it doesn't recognise — never blocks a tile. */
export function TileMotif({ gameId, className }: { gameId: string; className?: string }) {
  const motif = motifs[gameId];
  if (!motif) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={{ color: TILE_ACCENT[gameId] ?? "var(--color-flame)" }}
    >
      {motif}
    </svg>
  );
}
