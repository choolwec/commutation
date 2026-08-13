/**
 * PLAIN-ENGLISH RULES, per game id, shown by GameShell's "?" affordance.
 *
 * Deliberately its own file with zero imports from any game folder: GameShell
 * renders inside every one of the 16 games, so if this lived on GameModule
 * and GameShell imported the registry to read it, that would be a circular
 * import (GameShell → registry → every game/index.tsx → GameShell). Plain
 * data keyed by the same id strings rounds.game already uses sidesteps that
 * — GameShell only ever needs `round.game`, which it already reads via
 * useRoom(), to look itself up here.
 *
 * Each entry is 2-4 short lines: what you'll see, what you do, how the
 * reveal/scoring works. Keep it tight — this is read on a phone, often
 * once, sometimes mid-round while someone's waiting on you.
 */
export const RULES: Record<string, string[]> = {
  who_wrote_it: [
    "A real confession from someone in the group shows up — nobody knows whose it is yet, not even the host.",
    "Vote for who you think wrote it. Yes, you can vote for yourself to throw the room off.",
    "The host reveals the real author. Guess right and you score 100. If you're the author and you fooled people, you score 50 for every person who guessed wrong.",
  ],
  know_me_best: [
    "One of you is on the hot seat for a personal question, like \"their worst habit.\" Everyone else privately guesses what they actually said.",
    "The subject can't guess their own answer — they just wait for the reveal.",
    "Once the host opens it, every guess shows side by side with the real answer, and the subject (or the host, if needed) taps whoever guessed closest to hand them 100 points.",
  ],
  paranoia: [
    "One phone privately gets a \"Who here would ___?\" question — nobody else sees it.",
    "That person answers OUT LOUD with just a name. Don't repeat the question.",
    "Then a coin flip decides everything: reveal, and the room finds out what was asked; stays secret, and nobody ever will. Same flip, same moment, on every phone.",
  ],
  the_deep_end: [
    "A real, anonymous question gets shown — one of you wrote it in the survey, but nobody knows who yet.",
    "React \"same\" or \"never knew that\" as it lands. No guessing involved.",
    "Once everyone's reacted, the host reveals who actually wrote it.",
  ],
  truth_or_dare: [
    "Pick Warm, Real, or Reckless — dares get bolder and truths get more pointed the deeper the tier.",
    "Whoever's turn it is answers the truth out loud, or does the dare.",
    "Don't want it? Tap Pass — costs 25 points, 2 a day, but it instantly deals the next card for everyone, no waiting on the host.",
  ],
  most_likely_to: [
    "A \"Most likely to ___\" prompt shows up, pulled from the group's own survey answers.",
    "Everyone secretly votes for the person in the room they think fits best.",
    "The host reveals a live bar chart of where the votes landed — no right answer, whoever gets the most votes scores.",
  ],
  spyfall: [
    "This is Spyfall — if you know it as \"Skyfall,\" same game, just misremembered.",
    "Everyone but one secret Spy sees the same location and a personal role there. The Spy sees nothing.",
    "Ask each other questions about the location without saying it outright — the Spy is trying to figure out where you all are while blending in.",
    "When time's up, vote for who you think the Spy is. Guess right and you score; the Spy scores instead if they dodge the vote.",
  ],
  chameleon: [
    "Everyone sees the same word-grid — except the secret Chameleon, who only sees the topic.",
    "Going around, say ONE word connected to the secret word. The Chameleon has to bluff something that could fit anything on the grid.",
    "Vote for who you think the Chameleon is. Catch them and the room scores; the Chameleon scores instead if they survive the vote.",
  ],
  hot_takes: [
    "One of you secretly sees an exact spot on a spectrum, like \"Overrated ↔ Underrated.\"",
    "Give ONE spoken clue that hints at that exact spot — too obvious and everyone nails it free, too vague and nobody gets close.",
    "Everyone else drags a dial to guess where you meant. The host reveals the real spot and hands out points by how close each guess landed.",
  ],
  never_have_i_ever: [
    "A \"Never have I ever ___\" prompt gets read out loud.",
    "Tap IN if you HAVE done it, OUT if you haven't — your tap stays private until the host opens the reveal.",
    "No scoring here — it's a talking-point game, not a leaderboard one. See who's in and who's out, then talk about it.",
  ],
  mafia: [
    "One of you is secretly the Mafia — everyone else is Town, and doesn't know who.",
    "Night falls: close your eyes except the Mafia, who silently picks someone. Day breaks: the host reveals what happened, and the room discusses and votes to eliminate a suspect.",
    "Repeat until the Mafia is caught or the Mafia controls the room. The host moderates the elimination out loud — this app just deals the secret role and keeps score.",
  ],
  drawful: [
    "One of you gets a secret prompt to finger-draw on your phone while everyone else waits.",
    "Once it's done, everyone else writes a fake title trying to sound like the real prompt — the host mixes the REAL prompt in as one more \"title\" among the fakes.",
    "Vote for the title you think is real. Guess right and you score; write a title that fools someone and you score too. The artist scores bonus points for every person their drawing fooled.",
  ],
  fibbage: [
    "A wild true fact pops up with a blank in it. Everyone privately writes a convincing LIE to fill that blank.",
    "The host mixes the real fact in with everyone's lies — it's just one more option, indistinguishable from the rest.",
    "Vote for the one you think is real. Guess right and you score; write a lie that fools someone into picking it and you score too.",
  ],
  best_answer: [
    "Everyone answers the same prompt — pulled from the group's own survey when there's enough, backed up by the deck.",
    "Once everyone's in, the room votes for the funniest answer.",
    "The winner's author scores points scaled by how many votes they got — write something the room actually laughs at.",
  ],
  buzz_in_trivia: [
    "A trivia question shows up with multiple-choice options.",
    "First phone to slam BUZZ locks in — everyone else is frozen out until the host rules on it.",
    "Get it right and score big. Get it wrong and you actually lose points, so don't buzz on a pure guess.",
  ],
  buzz_in_music: [
    "A short clip streams live straight to the host's screen or speaker.",
    "First phone to slam BUZZ locks in and has to name the song out loud.",
    "Same rules as Trivia's buzzer: right answer scores big, wrong answer costs you points.",
  ],
};
