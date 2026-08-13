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
    "Last card in the deck is a FORFEIT: one person gets a card only their phone can see, and it involves ringing a real person. If it doesn't fit their life they can swap it, and nobody's told they did.",
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
    "Going around before the timer runs out, say ONE word connected to the secret word. The Chameleon has to bluff something that could fit anything on the grid.",
    "Vote for who you think the Chameleon is. Catch them and the room scores; the Chameleon scores 250 instead if they survive the vote.",
    "Caught anyway? You get one guess at the secret word for partial credit — nail it and you still score.",
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

  // ── the group's own rounds (docs/THEIR_ROUNDS.md) ────────────────────
  // These are the ones nobody has played before, so they get one extra
  // line each where the twist genuinely needs it.
  act_it_out: [
    "One person gets a word on their phone and acts it out. No talking, no spelling, no pointing at things in the room.",
    "Two cards in five come up OPPOSITE DAY — they act the opposite of their word, and you still have to type the word that's ON the card, not the one they're showing you.",
    "Everyone else types their guess. Anyone who gets it takes 100, and synonyms count — you won't lose it on 'tired' versus 'exhausted'.",
  ],
  thirty_seconds: [
    "One person gets a card of five things nobody else can see, and has 30 seconds to get the room to say all five.",
    "They can't say the word, any part of it, or 'rhymes with'. Everyone else just shouts — wrong answers cost nothing.",
    "The clock only starts when the describer taps GO, so they get a second to read. The count ticks up live on everyone's phone as they land.",
    "100 a word to the describer. Everyone takes a turn describing.",
  ],
  spell_it_out: [
    "One person reads a word out loud — they get it on their phone with a sentence to say it in.",
    "Everyone else spells it at the same time. No turns, no elimination, nobody sits and watches.",
    "The reveal puts every attempt side by side, which is the point. 100 for each correct spelling, and autocorrect is off.",
  ],
  survey_says: [
    "A prompt like \"name something you always forget when leaving the house\". Everyone writes a short answer privately.",
    "There's no right answer — you score by MATCHING other people in this room. Being predictable is the skill here.",
    "100 for every other person who wrote the same thing as you. Match two people and that's 200. Say something nobody else said and you get nothing.",
  ],
  question_volley: [
    "You get asked a question. Do NOT answer it — turn to the next person and ask them something instead.",
    "You've got three seconds. Freeze past that and you have to actually answer the one you were asked, honestly.",
    "Tap \"I froze\" on your own phone when it happens — nobody's policing it but you. Anyone who never cracks takes 100 at the end.",
  ],
  clap_circle: [
    "Sat in a circle. ONE clap passes it on the way the arrow's pointing. TWO claps sends it back the other way. THREE claps skips whoever's next.",
    "Clap out of turn, or miss your turn when it reaches you, and you're out. The host calls it — arguing about whether that was a clap is half the game.",
    "Points go by how long you survive: first out gets the least, last one standing takes the most.",
  ],
  contact: [
    "One person holds a secret word and reveals it one letter at a time. Everyone else can see the letters so far.",
    "Think you know it? Give the room a CLUE — never the word itself. If someone else reads the same word out of your clue, you both tap \"I've got a contact\", count 3-2-1 and say it together.",
    "The holder can BLOCK by naming the word being signalled first. If it's too close to call, the pair wins — the holder doesn't get to stall.",
    "150 each to a pair who land it, 150 to the holder for a clean block or for running the word all the way out.",
  ],
  centre_stage: [
    "Everyone performs once, in turn — you get a card telling you what the act is, and a minute on the clock.",
    "Everyone else rates it 1 to 5 while you're going. Rate COMMITMENT, not talent — nobody here can sing and that's not what's being scored.",
    "At the reveal every rating shows with the name of whoever gave it. No hiding behind an average.",
    "40 points per star. Going all-in on something stupid is the whole strategy.",
  ],
  speed_cards: [
    "This one's a real deck of cards on a real table — the app just runs the clock and keeps score.",
    "Each hand comes with a house twist (silent hand, left hand only, standing up). Play whatever shedding game the room knows, faster than usual.",
    "Shed your hand FIRST and you take the most points. The host taps people in as they go out.",
  ],
};
