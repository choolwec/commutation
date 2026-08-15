"use client";

/**
 * SOUND — three synthesized effects (WebAudio, never a CDN or a shipped
 * audio file), wired into the handful of shared components every game
 * already renders through, so 25 games get sound without 25 games each
 * needing an edit.
 *
 * Per PLAN.md's iOS notes: audio is blocked until a user gesture, and the
 * claim-tap on ClaimScreen is that gesture for this whole app — by the time
 * any of GameShell/RoundTimer/BuzzButton exist on screen, the user has
 * already tapped their name once, so the AudioContext this file lazily
 * creates unlocks itself the first time any of these actually fire, no
 * separate "tap to enable sound" screen needed.
 *
 * Respects a mute control (`GameShell`'s header) via localStorage, checked
 * fresh on every call rather than cached in a hook, since sound can fire
 * from timers and effects outside any component's render.
 */

const MUTE_KEY = "commutation:muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Private-mode Safari can throw on write — sound just stays unmuted.
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** One short synthesized tone. Silent, safely, if audio isn't available at all. */
function tone(freq: number, duration: number, type: OscillatorType, peak: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = c.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  } catch {
    // Any WebAudio hiccup degrades to silence, never a crash.
  }
}

function guarded(fn: () => void) {
  if (isMuted()) return;
  fn();
}

export const sound = {
  /** RoundTimer's last few seconds — a short high tick. */
  tick: () => guarded(() => tone(880, 0.05, "square", 0.05)),
  /** Buzz In's buzzer — a low, blunt hit. */
  buzz: () => guarded(() => tone(150, 0.22, "sawtooth", 0.16)),
  /** A round reaching its reveal — a quick three-note rise. */
  reveal: () =>
    guarded(() => {
      tone(523.25, 0.14, "sine", 0.1);
      tone(659.25, 0.16, "sine", 0.1, 0.09);
      tone(783.99, 0.22, "sine", 0.1, 0.18);
    }),
};
