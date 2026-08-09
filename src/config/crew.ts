/**
 * THE CREW — the six people playing.
 *
 * These are the profiles people claim when they first open the app.
 * The colour and emoji here are just defaults; everyone can override
 * both in survey section 1, and whatever they pick wins.
 */

export type CrewMember = {
  /** Stable id. Never change these — they're the DB foreign key. */
  id: string;
  name: string;
  /** Default avatar emoji, overridable in the survey. */
  emoji: string;
  /** Tailwind-friendly hex, used for their colour throughout the app. */
  color: string;
  /** Runs the day: advances rounds, holds the bypass code. */
  isHost?: boolean;
};

export const CREW: CrewMember[] = [
  { id: "choolwe", name: "Choolwe", emoji: "👑", color: "#f59e0b", isHost: true },
  { id: "chileleko", name: "Chileleko", emoji: "🔥", color: "#ef4444" },
  { id: "joy", name: "Joy", emoji: "✨", color: "#a855f7" },
  { id: "latasha", name: "Latasha", emoji: "🦋", color: "#06b6d4" },
  { id: "niza", name: "Niza", emoji: "🌙", color: "#6366f1" },
  { id: "chibesa", name: "Chibesa", emoji: "⚡", color: "#10b981" },
];

export const CREW_SIZE = CREW.length;

export function crewById(id: string): CrewMember | undefined {
  return CREW.find((m) => m.id === id);
}
