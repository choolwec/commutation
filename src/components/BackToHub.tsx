"use client";

import Link from "next/link";

/**
 * THE HARD RULE: every full-screen top-level view renders this, or
 * something that gets you to one within a tap or two.
 *
 * This app is meant to be added to an iPhone home screen and run standalone
 * — no browser chrome, no address bar, no swipe-back gesture. Once a page
 * fills the screen, whatever that page itself provides is the ONLY way out;
 * there is no fallback. Before this component existed, clicking the Vault
 * card, Photo recap, or Awards from the hub was a one-way trip.
 *
 * Applies to every route in src/app/*\/page.tsx and every state Gate can
 * render (including ClaimScreen — someone can land there directly from
 * /play, /awards, or /recap, not just from "/"). The one deliberate
 * exception is /tv: it's a fixed display meant to stay on a laptop all day
 * with nobody navigating it by hand, and a stray "back" tap there would
 * yank the shared screen away from a live round for the whole room.
 *
 * Deep inside the game console, GameShell's own ✕ ("leave this round")
 * satisfies the rule transitively — round → picker (which renders this) →
 * hub — rather than every one of 25 games needing its own hub link.
 *
 * Deliberately just a Link, not a header bar: callers place it wherever
 * their own layout wants it — inline in a flex header row (Launcher,
 * TestRoom), or absolutely positioned over a full-bleed centered screen
 * (PlayGate's countdown, ClaimScreen).
 */
export function BackToHub({
  className,
  absolute,
}: {
  className?: string;
  /** Pins it top-left over a screen with no header row of its own. */
  absolute?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Back to hub"
      className={`${
        absolute ? "absolute left-5 z-10" : "inline-block"
      } text-xs font-semibold text-mute ${className ?? ""}`}
      style={absolute ? { top: "calc(var(--sat) + 1.25rem)" } : undefined}
    >
      ← Hub
    </Link>
  );
}
