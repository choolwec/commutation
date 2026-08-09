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
  timeLabel: "1:00 – 8:00 PM",

  /** ── PLACEHOLDERS — replace these ─────────────────────────── */
  location: {
    name: "TBC",
    address: "Confirmed on Tuesday",
    /** Paste a Google/Apple Maps share link. Empty string hides the button. */
    mapsUrl: "",
    /** Anything useful: gate code, parking, "buzz flat 3", etc. Empty hides it. */
    note: "",
    /**
     * Set false once the venue is locked in — it swaps the "still being
     * sorted" line on the hub for the real address, so nobody turns up
     * somewhere wrong on the strength of a placeholder.
     */
    pending: true,
  },

  /**
   * Rough running order shown on the hub. Seven hours, deliberately loose —
   * there are far more games than fit, and that's the point: the day picks
   * what it wants rather than grinding through a list.
   */
  schedule: [
    { time: "1:00", what: "Arrive, eat, talk nonsense" },
    { time: "2:00", what: "Games begin — warm-up rounds" },
    { time: "3:30", what: "Big screen, phones as controllers" },
    { time: "5:00", what: "Food, and something involving standing up" },
    { time: "6:00", what: "Lights down. It gets worse." },
    { time: "7:30", what: "Awards + damage assessment" },
    { time: "8:00", what: "Out" },
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
