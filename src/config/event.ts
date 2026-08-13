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
   * The bypass code used to live here as a plaintext string — but this repo
   * is public (GitHub Pages, see HANDOFF §4), so anything in this file is
   * anyone's to read. It's now a value in the `room_secrets` table, which
   * has RLS on and NO select policy, checked only inside the
   * `unlock_with_code()` Postgres function. See supabase/migrations/0006 and
   * 0007. Set or change it directly in the SQL editor:
   *
   *   insert into room_secrets (key, value) values ('bypass_code', 'xxx')
   *     on conflict (key) do update set value = excluded.value;
   *
   * Never put the value in a file that gets committed.
   */

  /** Survey answer deadline, shown as gentle pressure on the hub. */
  surveyClosesAt: new Date(2026, 7, 14, 23, 59, 0),
  surveyClosesLabel: "Friday night",
} as const;

/**
 * True once THIS DEVICE's clock says the countdown has run out.
 *
 * Fine for display — the hub's countdown ring, "starts in 2h" copy. NOT the
 * source of truth for actually opening the Vault: six phones can disagree
 * about the time, so the games gate on `game_room.unlocked_at` in Postgres
 * instead (see src/lib/game/room.tsx's `unlocked`), set by whichever device
 * first calls `open_room_if_due()` after the server's own clock agrees.
 */
export function isUnlocked(now: Date = new Date()): boolean {
  return now.getTime() >= EVENT.unlocksAt.getTime();
}
