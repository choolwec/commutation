"use client";

import { useState } from "react";
import { usePlayer } from "@/lib/player";
import { EVENT } from "@/config/event";
import { BackToHub } from "@/components/BackToHub";

/**
 * First thing anyone sees: pick which of the six you are.
 *
 * Claiming binds the profile to this device's anonymous auth uid, which is
 * what every RLS policy checks. Taken profiles are shown but disabled — with
 * six people who all know each other, the failure mode to design against is
 * a mis-tap, not an impostor.
 */
export function ClaimScreen() {
  const { roster, claim } = usePlayer();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function pick(id: string, taken: boolean, name: string) {
    // A taken profile is recoverable, not dead: someone who mis-tapped, or
    // whose Safari cleared its storage, has to be able to get back in.
    // Taking over never exposes the previous session's answers.
    if (taken) {
      const ok = confirm(
        `${name} is already claimed on another device.\n\n` +
          `Only take this if it's yours — it'll sign the other device out.`,
      );
      if (!ok) return;
    }
    setBusy(id);
    setFailed(null);
    const done = await claim(id);
    if (!done) setFailed(id);
    setBusy(null);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pad-safe-t pad-safe-b">
      {/* Shown even though this also renders on "/" itself, where it's a
          harmless no-op — this screen is reached from /play, /awards and
          /recap too whenever nobody's claimed a profile yet on this device,
          and there it's a real dead end without it. See BackToHub's rule. */}
      <BackToHub absolute className="rise" />
      <div className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          {EVENT.name}
        </p>
        <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight">
          Who are you?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Tap your name. This is how you&apos;ll show up on Saturday.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {roster.map((p, i) => {
          const taken = Boolean(p.claimed_by);
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => pick(p.id, taken, p.name)}
              className={`rise relative flex flex-col items-start gap-2 rounded-2xl border border-line bg-ink-2 p-4 text-left transition active:scale-[0.97] disabled:opacity-50 ${
                taken ? "opacity-45" : ""
              }`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-full text-2xl"
                style={{ background: `${p.color}22` }}
              >
                {p.emoji}
              </span>
              <span className="text-base font-bold">{p.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-mute">
                {busy === p.id
                  ? "claiming…"
                  : taken
                    ? "taken · tap if yours"
                    : "that's me"}
              </span>
              {taken && (
                <span
                  className="absolute right-3 top-3 h-2 w-2 rounded-full"
                  style={{ background: p.color }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {failed && (
        <p className="mt-5 text-sm text-flame">
          That didn&apos;t go through. Try again, or pick another name and tell
          Choolwe.
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-mute">
        Picked wrong? Hand it back from the hub, or just tap the right name —
        taking a profile back never shows you anyone else&apos;s answers.
      </p>
    </main>
  );
}
