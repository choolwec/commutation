/**
 * DECKS FOR THE GROUP'S OWN ROUNDS.
 *
 * Content for the nine games built from docs/THEIR_ROUNDS.md — the twelve
 * "invent a round" answers from survey section 7, turned into real games.
 *
 * Its own file rather than more of decks.ts on purpose: decks.ts is already
 * ~490 lines covering the sixteen games that shipped first, and these decks
 * have a different shape to most of what's in there (answer keys, tiered
 * word lists, eligibility tags). Same house rules apply, unchanged:
 *
 *  - No drinking. Not a forfeit, not a dare, not a punishment. Ever.
 *  - Platonic group, bolder register (see decks.ts's header for the full
 *    boundary): flirtier and more romantically pointed is fair game, and the
 *    hard ceiling is untouched — nothing physical, nothing explicit.
 *  - Anything requiring an object assumes a normal living room.
 *
 * ANSWER-KEY NOTE: several of these decks ship the answer in the bundle
 * (spelling words, charade cards). That's the same trust level decks.ts's
 * Fibbage facts and Trivia answers already accept — a determined cheater
 * could read them in devtools, exactly like reading a board game's answer
 * booklet out of the box. The one place it would actually matter — who gets
 * dealt the private card — is decided by Postgres, not the dealing device.
 */

// ─── ACT IT OUT: OPPOSITE DAY (THEIR_ROUNDS §1.1) ───────────────────────────
// The performer acts the OPPOSITE of the word on their card; everyone else
// types the word that was ON the card. So every entry here needs an opposite
// that's both unambiguous and physically actable — which rules out most
// everyday charade prompts ("losing your keys" has no opposite you can mime).
//
// `accept` exists because auto-scoring is an exact match: "worn out" and
// "exhausted" are the same guess from a room's point of view, and losing a
// point to a synonym is the fastest way to make an auto-scored round feel
// unfair. First entry is the canonical one shown at the reveal.

export type OppositeCard = { word: string; accept: string[] };

export const OPPOSITES: OppositeCard[] = [
  { word: "Freezing", accept: ["freezing", "cold", "freezing cold"] },
  { word: "Exhausted", accept: ["exhausted", "tired", "worn out", "sleepy"] },
  { word: "Rich", accept: ["rich", "wealthy", "loaded"] },
  { word: "Terrified", accept: ["terrified", "scared", "afraid", "frightened"] },
  { word: "Ancient", accept: ["ancient", "old", "elderly"] },
  { word: "Tiny", accept: ["tiny", "small", "little"] },
  { word: "Silent", accept: ["silent", "quiet", "silence"] },
  { word: "In a rush", accept: ["in a rush", "rushing", "hurrying", "in a hurry", "late"] },
  { word: "Delicious", accept: ["delicious", "tasty", "nice", "good food"] },
  { word: "Winning", accept: ["winning", "victory", "champion"] },
  { word: "Confident", accept: ["confident", "bold", "sure"] },
  { word: "Heavy", accept: ["heavy", "weight", "weighty"] },
  { word: "Filthy", accept: ["filthy", "dirty", "messy"] },
  { word: "Generous", accept: ["generous", "giving", "kind"] },
  { word: "Wide awake", accept: ["wide awake", "awake", "alert", "energetic"] },
  { word: "Strong", accept: ["strong", "powerful", "muscular"] },
  { word: "Boiling", accept: ["boiling", "hot", "boiling hot"] },
  { word: "Furious", accept: ["furious", "angry", "raging", "mad"] },
  { word: "Famous", accept: ["famous", "celebrity", "well known"] },
  { word: "Graceful", accept: ["graceful", "elegant", "smooth"] },
];

// ─── SPELL IT OUT (THEIR_ROUNDS §1.2) ───────────────────────────────────────
// One reader gets the word privately and says it out loud; everyone else
// spells it at the same time, and the reveal puts every attempt side by side.
// The `say` line is the reader's script — a real spelling bee gives you the
// word in a sentence, and it stops the reader accidentally spelling it out
// by over-enunciating.
//
// Escalating: tier 1 is winnable by everyone, tier 3 is where the round is
// actually decided. British spellings throughout, same as the rest of the app.

export type SpellingWord = { word: string; say: string; tier: 1 | 2 | 3 };

export const SPELLING_WORDS: SpellingWord[] = [
  { word: "necessary", say: "It is not necessary to shout.", tier: 1 },
  { word: "separate", say: "They sleep in separate rooms.", tier: 1 },
  { word: "definitely", say: "He is definitely lying.", tier: 1 },
  { word: "embarrass", say: "Please do not embarrass me tonight.", tier: 1 },
  { word: "rhythm", say: "She has no rhythm whatsoever.", tier: 2 },
  { word: "occurrence", say: "That was a strange occurrence.", tier: 2 },
  { word: "conscience", say: "His conscience finally caught up with him.", tier: 2 },
  { word: "maintenance", say: "The car needs maintenance again.", tier: 2 },
  { word: "privilege", say: "It is a privilege to be here.", tier: 2 },
  { word: "millennium", say: "Nobody has done that in a millennium.", tier: 2 },
  { word: "entrepreneur", say: "Every entrepreneur says that at first.", tier: 3 },
  { word: "questionnaire", say: "You all filled in the questionnaire.", tier: 3 },
  { word: "bureaucracy", say: "The bureaucracy took three months.", tier: 3 },
  { word: "conscientious", say: "She is a conscientious worker.", tier: 3 },
  { word: "onomatopoeia", say: "Bang and crash are onomatopoeia.", tier: 3 },
];

// ─── SURVEY SAYS (THEIR_ROUNDS §1.3) ────────────────────────────────────────
// The six-person shape of Family Feud: there's no pre-ranked board, you score
// by matching other people in the room. So every prompt here has to be one
// where a group of six will genuinely converge — "name a fruit" converges,
// "name something surprising" doesn't, and a prompt that never collides pays
// nobody and feels broken.

export const SURVEY_SAYS_PROMPTS: string[] = [
  "Name something you always forget when leaving the house",
  "Name a reason someone would be late to a hangout",
  "Name something everyone has in their bag right now",
  "Name a food you'd be annoyed to find had run out",
  "Name something people lie about on a first date",
  "Name a song this room could all sing the chorus of",
  "Name something you do when you're pretending to be busy",
  "Name a thing every Zambian household definitely has",
  "Name something you'd grab first if the house was flooding",
  "Name a reason someone leaves a message on read",
  "Name something people always say when a photo is taken",
  "Name a chore everyone puts off for as long as possible",
  "Name something you'd never lend to a friend",
  "Name a place you'd rather not run into an ex",
  "Name something people do on their phone in an awkward silence",
  "Name a smell that instantly takes you back to childhood",
  "Name an excuse for leaving a party early",
  "Name something that instantly ruins a good mood",
  "Name a thing people pretend to enjoy",
  "Name something you'd never post on your story",
  "Name a body part people complain about after a long day",
  "Name a thing this group is guaranteed to argue about today",
];

// ─── 30 SECONDS (THEIR_ROUNDS §2.5) ─────────────────────────────────────────
// One describer, one card of five, thirty seconds, and you may not say the
// word. Mixed on purpose — people, places, things and situations — so a card
// never turns into five of the same kind and stalls on one person's blind
// spot.

export const THIRTY_SECOND_CARDS: string[][] = [
  ["Victoria Falls", "Toothbrush", "Beyoncé", "Traffic jam", "Wedding"],
  ["Nshima", "WhatsApp", "Barber", "Thunderstorm", "Referee"],
  ["Passport", "Netball", "Lion", "Group chat", "Sunburn"],
  ["Minibus", "Michael Jackson", "Wi-Fi", "Funeral", "Pineapple"],
  ["Alarm clock", "Lusaka", "Detention", "Karaoke", "Crocodile"],
  ["Cinema", "Umbrella", "Interview", "Elephant", "Birthday cake"],
  ["Petrol station", "Nurse", "Snapchat", "Marathon", "Mosquito"],
  ["Church choir", "Sunglasses", "Homework", "Aeroplane", "Chilli"],
  ["Market", "Photographer", "Blackout", "Goalkeeper", "Mango"],
  ["Hair salon", "Calculator", "Snake", "First date", "Football pitch"],
  ["Bank queue", "Grandmother", "Podcast", "Rainy season", "Suitcase"],
  ["Chess", "Dentist", "Bridesmaid", "Charger", "Giraffe"],
  ["Swimming pool", "Newsreader", "Sneezing", "Library", "Avocado"],
  ["Taxi driver", "Fireworks", "Exam hall", "Puppy", "Sandals"],
  ["Stadium", "Politician", "Ice cream", "Handshake", "Tortoise"],
  ["Wedding DJ", "Whistle", "Hospital", "Chameleon", "Pancakes"],
];

// ─── CONTACT (THEIR_ROUNDS §2.3) ────────────────────────────────────────────
// The word-holder reveals one letter at a time and the room races to signal
// each other into the same word. Words are 6-9 letters and concrete: an
// abstract word gives the room nothing to build a clue on, and anything
// shorter than six is over before the second letter.

export const CONTACT_WORDS: string[] = [
  "MARKET", "SILENCE", "TROUBLE", "MIRROR", "JOURNEY", "PROMISE",
  "THUNDER", "KITCHEN", "BLANKET", "MONSTER", "CAPTAIN", "WHISPER",
  "VILLAGE", "HARVEST", "PICTURE", "COMPASS", "TREASURE", "CHAMPION",
  "BIRTHDAY", "PASSPORT", "SANDWICH", "ELEPHANT", "STRANGER", "MIDNIGHT",
];

// ─── CENTRE STAGE (THEIR_ROUNDS §3.3) ───────────────────────────────────────
// Peer-rated performance. The brief on this one was explicit: reward
// commitment, not skill — so nothing here needs you to actually be able to
// sing, and every card is winnable by whoever is willing to look the most
// ridiculous.

export type StageChallenge = { name: string; brief: string };

export const STAGE_CHALLENGES: StageChallenge[] = [
  { name: "The Chorus", brief: "Sing the chorus of a song the room picks. No backing track, no mercy." },
  { name: "The Advert", brief: "Sell the room an ordinary object from this room, as a 30-second TV advert." },
  { name: "The Acceptance Speech", brief: "Accept an award you did not win, thanking at least three people in this room by name." },
  { name: "The Weather", brief: "Present tonight's weather forecast for this house, live, with full news-anchor energy." },
  { name: "The Text Message", brief: "Read your most recent text message out loud as if it's the climax of a film." },
  { name: "The Motivational Speech", brief: "Give the room 30 seconds of genuine motivation about something completely trivial." },
  { name: "The Interview", brief: "Answer 'so tell me about yourself' as the most arrogant person alive." },
  { name: "The Nature Documentary", brief: "Narrate what the person on your left is doing, in full David Attenborough." },
  { name: "The Villain", brief: "Deliver your villain monologue. The room is your captured hero." },
  { name: "The Toast", brief: "Give a wedding toast for two people in this room. Make it emotional." },
  { name: "The Complaint", brief: "Complain to a manager about this hangout. Ask for a refund." },
  { name: "The Love Song", brief: "Improvise eight bars of a love song about the last thing you ate." },
  { name: "The Sermon", brief: "Preach a two-minute sermon on why people should reply to messages." },
  { name: "The Auction", brief: "Auction off the person to your right. Start the bidding high." },
  { name: "The Trailer", brief: "Voice the trailer for a film about today. Deep voice, dramatic pauses." },
  { name: "The Apology", brief: "Publicly apologise for something you have absolutely not done." },
];

// ─── SPEED CARDS (THEIR_ROUNDS §3.1) ────────────────────────────────────────
// The deck is physical and in the house — the app runs the clock and the
// finishing order, nothing else. These are house twists the host can drop on
// a hand to stop six rounds of the same game flattening out.

export const SPEED_CARD_TWISTS: string[] = [
  "Straight hand — no twists. Play it clean.",
  "Silent hand. Nobody speaks. A word costs you one card.",
  "Left hand only. Both hands and you pick up two.",
  "Everyone plays standing up. Sitting down costs a card.",
  "Losers' revenge — whoever went out last this hand deals and goes first.",
  "Speed round. Ten seconds a turn, timed on the phone.",
  "No names. Say anyone's name and you take a card.",
  "Swap seats with the person opposite before this hand starts.",
  "Whoever goes out first picks the twist for the next hand.",
  "Eyes on the table only. Look at another player's hand, take a card.",
];

// ─── QUESTION VOLLEY (THEIR_ROUNDS §3.4) ────────────────────────────────────
// You're asked a question; you must immediately ask the NEXT person one
// instead of answering. Hesitate past three seconds and you have to answer
// the one you were asked. These are opening serves — after the first volley
// the questions come from the room, not the app.

export const VOLLEY_OPENERS: string[] = [
  "What's the last thing you lied about?",
  "Who in this room would you call at 3am?",
  "What's the worst gift you've ever received?",
  "What do you think people get wrong about you?",
  "Who here has the best taste in music?",
  "What's something you pretend to like?",
  "Who in this room would survive the longest without their phone?",
  "What's the pettiest thing you've ever done?",
  "What's a compliment you never believe?",
  "Who here is the worst at replying to messages?",
  "What's the last thing that made you genuinely nervous?",
  "What do you spend far too much money on?",
];

// ─── TRUTH OR DARE: THE FORFEIT DECK (THEIR_ROUNDS §2.1) ────────────────────
// Reckless-tier only, dealt privately to one randomly chosen player, and
// every card involves phoning or messaging a specific real person outside
// this room. Same ceiling as decks.ts: nothing physical, nothing explicit,
// no drinking, and nothing that lands as cruelty rather than a bit.
//
// `needs` is the eligibility condition the original idea insisted on — a
// forfeit that doesn't fit its target must never be performed. See
// 0016_forfeits.sql's header for why that check ended up on the recipient's
// own phone rather than in a survey-fed filter: the survey never asked
// anything that could answer it, and a public column on `players` would
// broadcast the answer to the whole room, which is worse than the problem.

export type Forfeit = { content: string; needs: string };

export const FORFEITS: Forfeit[] = [
  {
    content: "Call your mum. Tell her you're bringing someone home to meet her next month. Do not explain yourself. Speaker on.",
    needs: "a parent you could actually ring right now",
  },
  {
    content: "Ring the last person who left you on read and ask them, sincerely, what you did wrong.",
    needs: "someone who has left you on read recently",
  },
  {
    content: "Voice-note your oldest sibling your honest ranking of all the siblings, worst to best.",
    needs: "at least one sibling",
  },
  {
    content: "Call your best friend outside this room and ask them to describe your type in exactly three words. Speaker on.",
    needs: "a close friend who isn't in this room",
  },
  {
    content: "Text the person you message most today: \"I've been thinking about you all afternoon.\" Read out whatever comes back.",
    needs: "someone you text most days",
  },
  {
    content: "Call a cousin and ask them to tell the room the most embarrassing story they have about you.",
    needs: "a cousin whose number you have",
  },
  {
    content: "Ring the last person in your call history and ask them to rate your last three life decisions out of ten.",
    needs: "anyone at all in your recent calls",
  },
  {
    content: "Send your ex — or the closest thing you've got to one — a message the room writes for you. The room may not be cruel, but it may be nosy.",
    needs: "an ex, or a situationship that ended",
  },
  {
    content: "Call whoever you've saved under the softest nickname in your phone. Put it on speaker and let the room hear how you greet them.",
    needs: "someone saved under a nickname",
  },
  {
    content: "Ring a friend who has met someone you liked, and ask them what they honestly thought of that person.",
    needs: "a friend who's met someone you were into",
  },
  {
    content: "Text your group chat: \"be honest, what's my most annoying habit?\" Read every reply out loud as it lands.",
    needs: "a group chat that's actually active",
  },
  {
    content: "Call the person in your contacts you've known longest and ask them what they thought of you the day you met.",
    needs: "someone you've known for years",
  },
];
