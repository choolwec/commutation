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
