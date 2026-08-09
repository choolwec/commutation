/**
 * EVENT CONFIG — Choolwe, this is the file to edit.
 *
 * Everything the info hub shows lives here. Change a string, save, redeploy.
 * Nothing else in the app needs touching.
 */

export const EVENT = {
  /** App name, shown everywhere. */
  name: "Commutation",

  /** One-line hook under the title on the landing page. */
  tagline: "Six people. One Saturday. No mercy.",

  /**
   * When the games unlock. THE most important line in this file.
   * Month is 0-indexed in JS: 7 = August.
   * This is read as local time on whatever device is looking at it.
   */
  unlocksAt: new Date(2026, 7, 15, 13, 0, 0),

  /** Shown on the countdown so nobody has to decode a timestamp. */
  dateLabel: "Saturday 15 August",
  timeLabel: "1:00 PM",

  /** ── PLACEHOLDERS — replace these ─────────────────────────── */
  location: {
    name: "TBC",
    address: "Address goes here",
    /** Paste a Google/Apple Maps share link. Empty string hides the button. */
    mapsUrl: "",
    /** Anything useful: gate code, parking, "buzz flat 3", etc. Empty hides it. */
    note: "",
  },

  /** Rough running order shown on the hub. Purely informational. */
  schedule: [
    { time: "1:00 PM", what: "Arrive, eat, talk nonsense" },
    { time: "2:00 PM", what: "Games begin" },
    { time: "5:00 PM", what: "Food break" },
    { time: "7:00 PM", what: "It gets worse" },
    { time: "Late", what: "Awards + damage assessment" },
  ],

  /** Bullet list on the hub. */
  bring: [
    "Your phone, fully charged",
    "A power bank if you have one",
    "Something to share",
  ],

  /**
   * Secret bypass code — force-unlocks the games early if plans shift.
   * Use it at /unlock. Change this; don't tell anyone.
   */
  bypassCode: "letmein",

  /** Survey answer deadline, shown as gentle pressure on the hub. */
  surveyClosesAt: new Date(2026, 7, 12, 23, 59, 0),
  surveyClosesLabel: "Tuesday night",
} as const;

/** True once the countdown has run out (or the bypass has been used). */
export function isUnlocked(now: Date = new Date()): boolean {
  return now.getTime() >= EVENT.unlocksAt.getTime();
}
