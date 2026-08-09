/**
 * THE SURVEY.
 *
 * Every answer here becomes a game on Saturday. Nothing is compulsory —
 * every question can be skipped and the survey still submits.
 *
 * Design notes, so future edits don't break the games downstream:
 *  - `feeds` records which Saturday game consumes the answer. Don't orphan a question.
 *  - Nothing is self-tagged for intensity. Asking someone to grade their own
 *    confession is exactly what makes them water it down; sorting happens later.
 *  - `anonymous: true` means the answer is shown on the day WITHOUT the author's
 *    name attached (guessing the author IS the game). It does not mean we don't
 *    store who wrote it — we must, to score the round.
 */

export type QuestionKind =
  | "short" // single-line text
  | "long" // textarea
  | "choice" // pick one of `options`
  | "person" // pick one of the crew
  | "scale" // 0-100 slider
  | "emoji" // emoji picker
  | "color"; // colour picker

export type Question = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  /** Small grey text under the prompt. */
  hint?: string;
  placeholder?: string;
  options?: string[];
  /** Slider end labels, for `scale`. */
  scaleLabels?: [string, string];
  /** Shown on the day without the author's name attached. */
  anonymous?: boolean;
  /** Which Saturday game eats this answer. */
  feeds?: string;
  /** Renders as a repeatable list — up to `max` separate answers. */
  repeatable?: number;
};

export type Section = {
  id: string;
  title: string;
  /** Shown at the top of the section. Sets the tone. */
  blurb: string;
  icon: string;
  questions: Question[];
};

export const SECTIONS: Section[] = [
  // ─────────────────────────────────────────────────────────────
  {
    id: "yours",
    title: "Make it yours",
    icon: "🎨",
    blurb:
      "Thirty seconds. This is how you show up on everyone else's screen on Saturday.",
    questions: [
      {
        id: "emoji",
        kind: "emoji",
        prompt: "Pick your emoji",
        hint: "It follows you all day — on the scoreboard, on every vote, on the TV.",
      },
      {
        id: "color",
        kind: "color",
        prompt: "Pick your colour",
        hint: "Yours alone. Choose violently.",
      },
      {
        id: "hype_word",
        kind: "short",
        prompt: "Your walk-on word",
        hint: "Shouted by the app every time you win a round. One or two words.",
        placeholder: "e.g. UNTOUCHABLE",
      },
      {
        id: "trash_talk",
        kind: "short",
        prompt: "Something to say when you take first place",
        hint: "It'll be on the big screen. Make it hurt.",
        placeholder: "e.g. was never in doubt",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "about_you",
    title: "About you",
    icon: "🪞",
    blurb:
      "On Saturday everyone will try to guess these before they're revealed. The more surprising the truth, the more points they lose.",
    questions: [
      {
        id: "irrational_fear",
        kind: "short",
        prompt: "An irrational fear you actually have",
        feeds: "Know Me Best",
        placeholder: "no judgement, everyone's is stupid",
      },
      {
        id: "worst_habit",
        kind: "short",
        prompt: "Your worst habit",
        feeds: "Know Me Best",
      },
      {
        id: "overestimate",
        kind: "short",
        prompt: "Something people always get wrong about you",
        feeds: "Know Me Best",
      },
      {
        id: "cry",
        kind: "short",
        prompt: "The last thing that made you cry",
        hint: "Film, song, person, advert — anything.",
        feeds: "Know Me Best",
      },
      {
        id: "flex",
        kind: "short",
        prompt: "Something you're genuinely, unreasonably good at",
        feeds: "Know Me Best",
      },
      {
        id: "guilty_pleasure",
        kind: "short",
        prompt: "The guilty pleasure you'd deny in public",
        feeds: "Know Me Best",
      },
      {
        id: "three_am",
        kind: "long",
        prompt: "What's the thing you overthink at 3am?",
        feeds: "The Deep End",
      },
      {
        id: "five_years",
        kind: "long",
        prompt: "Where do you actually think you'll be in five years?",
        hint: "Not the LinkedIn answer.",
        feeds: "The Deep End",
      },
      {
        id: "changed",
        kind: "long",
        prompt: "How have you changed since we all met?",
        feeds: "The Deep End",
      },
      {
        id: "never_told",
        kind: "long",
        prompt: "Something about you nobody in this group knows",
        hint: "This one's worth the most points on Saturday. Go on.",
        feeds: "Know Me Best",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "confessions",
    title: "Confessions",
    icon: "🔒",
    blurb:
      "These appear on Saturday with your name stripped off, and everyone has to guess who wrote them. You get points for every person who guesses wrong — so the safe answer is the worthless one. Nobody sees these before the day. Not even Choolwe.",
    questions: [
      {
        id: "confession",
        kind: "long",
        prompt: "A confession",
        hint: "The rule: if it wouldn't make the room go quiet, write a different one.",
        anonymous: true,
        feeds: "Who Wrote It?",
        repeatable: 3,
        placeholder: "nobody will know it was you unless they guess it",
      },
      {
        id: "worst_thing",
        kind: "long",
        prompt: "The worst thing you've done that you got away with",
        anonymous: true,
        feeds: "Who Wrote It?",
      },
      {
        id: "lied_about",
        kind: "long",
        prompt: "Something you've lied to this group about",
        anonymous: true,
        feeds: "Who Wrote It?",
      },
      {
        id: "unpopular_confession",
        kind: "long",
        prompt: "The pettiest thing you've ever held a grudge over",
        anonymous: true,
        feeds: "Who Wrote It?",
      },
      {
        id: "embarrassing",
        kind: "long",
        prompt: "Your most embarrassing moment of the last year",
        anonymous: true,
        feeds: "Who Wrote It?",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "hot_takes",
    title: "Hot takes",
    icon: "🌶️",
    blurb:
      "Opinions that would actually start an argument in the room. On Saturday we find out who agrees with you — and you might not like the answer.",
    questions: [
      {
        id: "hot_take",
        kind: "long",
        prompt: "A hot take you'd defend out loud",
        hint: "If everyone would nod along, it isn't hot.",
        feeds: "Hot Takes",
        repeatable: 3,
      },
      {
        id: "overrated",
        kind: "short",
        prompt: "Something everyone loves that's actually overrated",
        feeds: "Hot Takes",
      },
      {
        id: "underrated",
        kind: "short",
        prompt: "Something everyone sleeps on that's genuinely great",
        feeds: "Hot Takes",
      },
      {
        id: "hill",
        kind: "short",
        prompt: "The hill you'd die on",
        feeds: "Hot Takes",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "the_group",
    title: "About the group",
    icon: "👀",
    blurb:
      "Answers here are sealed until Saturday, when they're read out and you get to watch people work out it was you.",
    questions: [
      {
        id: "most_likely_prompt",
        kind: "short",
        prompt: "Write a 'most likely to ___' about this group",
        hint: "We'll all vote on it. Make it a question you want the answer to.",
        feeds: "Most Likely To",
        repeatable: 3,
        placeholder: "most likely to...",
      },
      {
        id: "funniest",
        kind: "person",
        prompt: "Who's genuinely the funniest?",
        anonymous: true,
        feeds: "Awards",
      },
      {
        id: "worst_liar",
        kind: "person",
        prompt: "Who's the worst liar?",
        anonymous: true,
        feeds: "Awards",
      },
      {
        id: "most_chaotic",
        kind: "person",
        prompt: "Who's the most chaotic?",
        anonymous: true,
        feeds: "Awards",
      },
      {
        id: "secret_keeper",
        kind: "person",
        prompt: "Who would you actually trust with a secret?",
        anonymous: true,
        feeds: "Awards",
      },
      {
        id: "win_today",
        kind: "person",
        prompt: "Who's going to win on Saturday?",
        hint: "Scored at the end of the day. Betting on yourself is allowed.",
        anonymous: true,
        feeds: "Awards",
      },
      {
        id: "nice_thing",
        kind: "long",
        prompt: "Say something real about someone in this group",
        hint: "Name them. This one gets read out at the end of the night, anonymously.",
        anonymous: true,
        feeds: "Closing",
        repeatable: 3,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "build",
    title: "Build the game",
    icon: "🛠️",
    blurb:
      "Everything you write here gets played on Saturday, by everyone, out loud. Including by you. Bear that in mind — or don't.",
    questions: [
      {
        id: "truth",
        kind: "long",
        prompt: "Write a truth question",
        hint: "It will get asked. Possibly to you.",
        feeds: "Truth or Dare",
        repeatable: 3,
      },
      {
        id: "dare",
        kind: "long",
        prompt: "Write a dare",
        hint: "Same warning. Nothing that breaks anything or anyone.",
        feeds: "Truth or Dare",
        repeatable: 3,
      },
      {
        id: "paranoia",
        kind: "long",
        prompt: "Write a Paranoia question",
        hint: "'Who here would ___?' — one person hears it, answers a name out loud, and a coin flip decides whether anyone ever learns the question.",
        feeds: "Paranoia",
        repeatable: 3,
        placeholder: "who here would...",
      },
      {
        id: "quiplash",
        kind: "short",
        prompt: "Write a prompt for people to answer as funnily as possible",
        hint: "Leave a blank to fill in.",
        feeds: "Best Answer",
        repeatable: 3,
        placeholder: "e.g. the worst possible thing to say at a funeral: ___",
      },
      {
        id: "deep_q",
        kind: "long",
        prompt: "Write a question you actually want to hear everyone answer",
        feeds: "The Deep End",
        repeatable: 2,
      },
      {
        id: "never",
        kind: "short",
        prompt: "Write a 'never have I ever'",
        feeds: "Never Have I Ever",
        repeatable: 3,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "invent",
    title: "Invent a round",
    icon: "💡",
    blurb:
      "This is the one. Describe a game you want to play and it gets built into the app for Saturday. One sentence is genuinely enough — 'everyone rates each other and the lowest score has to call someone' is a complete idea. Don't worry about whether it's possible.",
    questions: [
      {
        id: "game_idea",
        kind: "long",
        prompt: "A game you want to play",
        hint: "Rough is fine. Half-formed is fine. We'll figure out the rules.",
        feeds: "Their Rounds",
        repeatable: 3,
        placeholder: "describe it however it comes out",
      },
      {
        id: "stolen_idea",
        kind: "long",
        prompt: "A game you've played before and want to play again",
        hint: "Anything — a party game, something from a night out, something from school.",
        feeds: "Their Rounds",
      },
      {
        id: "punishment",
        kind: "short",
        prompt: "What should happen to whoever comes last?",
        feeds: "Awards",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "logistics",
    title: "The boring bit",
    icon: "📋",
    blurb: "Thirty seconds and you're done. This part is actually useful.",
    questions: [
      {
        id: "arrival",
        kind: "short",
        prompt: "What time are you actually arriving?",
        hint: "Be honest.",
        placeholder: "e.g. 1:30ish",
      },
      {
        id: "bringing",
        kind: "short",
        prompt: "What are you bringing?",
        placeholder: "food, drinks, a speaker, nothing",
      },
      {
        id: "food",
        kind: "short",
        prompt: "Anything you don't eat?",
        hint: "Allergies, dislikes, the lot.",
      },
      {
        id: "music",
        kind: "short",
        prompt: "One song that has to be played",
        feeds: "Playlist",
      },
      {
        id: "anything_else",
        kind: "long",
        prompt: "Anything else?",
        hint: "Requests, warnings, threats.",
      },
    ],
  },
];

/** Total question slots, counting repeatables once each. */
export const TOTAL_QUESTIONS = SECTIONS.reduce(
  (n, s) => n + s.questions.length,
  0,
);

export function sectionById(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}
