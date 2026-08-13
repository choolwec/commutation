/**
 * THE REGISTRY.
 *
 * Every playable game, in one list. `start_round`/`start_deck_round` in
 * Postgres take a game id as a plain string — this file is what turns that
 * id back into an actual module to render. Adding a game is: write the
 * folder, import it, add one line here.
 */
import type { GameModule } from "@/lib/game/types";

import { whoWroteIt } from "./vault/who-wrote-it";
import { knowMeBest } from "./vault/know-me-best";
import { paranoia } from "./vault/paranoia";
import { theDeepEnd } from "./vault/the-deep-end";
import { truthOrDare } from "./vault/truth-or-dare";

import { mostLikelyTo } from "./huddle/most-likely-to";
import { spyfall } from "./huddle/spyfall";
import { chameleon } from "./huddle/chameleon";
import { hotTakes } from "./huddle/hot-takes";
import { neverHaveIEver } from "./huddle/never-have-i-ever";
import { mafia } from "./huddle/mafia";

import { fibbage } from "./arena/fibbage";
import { bestAnswer } from "./arena/best-answer";
import { buzzInTrivia, buzzInMusic } from "./arena/buzz-in";
import { drawful } from "./arena/drawful";

// The group's own, from survey section 7 — see docs/THEIR_ROUNDS.md. Marked
// `origin: "group"` on each module, which is what the Launcher groups on.
import { actItOut } from "./huddle/act-it-out";
import { thirtySeconds } from "./huddle/thirty-seconds";
import { spellItOut } from "./huddle/spell-it-out";
import { surveySays } from "./huddle/survey-says";
import { clapCircle } from "./huddle/clap-circle";
import { questionVolley } from "./huddle/question-volley";
import { speedCards } from "./huddle/speed-cards";
import { centreStage } from "./huddle/centre-stage";
import { contact } from "./huddle/contact";

export const GAMES: GameModule[] = [
  // 🔒 Vault
  whoWroteIt,
  knowMeBest,
  paranoia,
  theDeepEnd,
  truthOrDare,
  // 📱 Huddle
  mostLikelyTo,
  spyfall,
  chameleon,
  hotTakes,
  neverHaveIEver,
  mafia,
  // 📱 Huddle — the group's own rounds
  actItOut,
  thirtySeconds,
  spellItOut,
  surveySays,
  questionVolley,
  clapCircle,
  contact,
  centreStage,
  speedCards,
  // 📺 Arena
  drawful,
  fibbage,
  bestAnswer,
  buzzInTrivia,
  buzzInMusic,
];

export function gameById(id: string): GameModule | undefined {
  return GAMES.find((g) => g.id === id);
}

export const HALL_LABEL: Record<GameModule["hall"], string> = {
  vault: "🔒 The Vault",
  huddle: "📱 The Huddle",
  arena: "📺 The Arena",
};

export const HALL_BLURB: Record<GameModule["hall"], string> = {
  vault: "Sealed until the day. Runs on your own answers.",
  huddle: "Phone-in-hand, sat in a circle. No TV needed.",
  arena: "TV is the stage, every phone is a remote.",
};
