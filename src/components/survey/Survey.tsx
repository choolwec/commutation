"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SECTIONS, TOTAL_QUESTIONS } from "@/config/survey";
import { usePlayer } from "@/lib/player";
import { useAnswers, key } from "@/lib/useAnswers";
import { EVENT } from "@/config/event";
import { Field } from "./Field";

const LAST_SECTION = "commutation:last-section";

export function Survey() {
  const { me, updateMe } = usePlayer();
  const { answers, set, flush, loaded, saveState } = useAnswers();
  // Resume where they left off. People fill this in over several sittings on
  // a phone, and landing back on section 1 every time is how you lose them.
  //
  // Read in the initialiser rather than an effect: Survey only ever mounts
  // after PlayerProvider has finished loading, which is necessarily after
  // hydration, so there's no server/client mismatch to worry about.
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.sessionStorage.getItem(LAST_SECTION);
    if (!saved) return 0;
    const i = SECTIONS.findIndex((s) => s.id === saved);
    return i >= 0 ? i : 0;
  });
  const [done, setDone] = useState(false);

  const section = SECTIONS[step];

  useEffect(() => {
    sessionStorage.setItem(LAST_SECTION, SECTIONS[step].id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  const answered = useMemo(
    () => Object.values(answers).filter((v) => v.trim() !== "").length,
    [answers],
  );
  const pct = Math.min(100, Math.round((answered / TOTAL_QUESTIONS) * 100));

  // Section 1 doubles as profile setup, so mirror those onto the player row
  // where the rest of the app reads them from (leaderboard, TV mode).
  //
  // hype_word/trash_talk are free text, so this fires on every keystroke —
  // debounced, because the mirror is read elsewhere in the app but never by
  // this input (its value comes from `answers`, below), so there's nothing
  // to lose by waiting for a pause. Undebounced, every keystroke wrote to
  // Supabase and re-rendered every field on the page.
  const profileTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const profilePending = useRef<Map<string, string>>(new Map());
  function mirrorToProfile(field: "hype_word" | "trash_talk", value: string) {
    profilePending.current.set(field, value);
    const existing = profileTimers.current.get(field);
    if (existing) clearTimeout(existing);
    profileTimers.current.set(
      field,
      setTimeout(() => {
        profilePending.current.delete(field);
        void updateMe({ [field]: value });
      }, 700),
    );
  }

  function handleChange(qid: string, i: number, v: string) {
    set(qid, i, v);
    if (qid === "emoji" && v) void updateMe({ emoji: v });
    if (qid === "color" && v) void updateMe({ color: v });
    if (qid === "hype_word") mirrorToProfile("hype_word", v);
    if (qid === "trash_talk") mirrorToProfile("trash_talk", v);
  }

  // Leaving mid-debounce shouldn't drop the mirror write — the authoritative
  // copy is already safe in survey_responses via set()/flush(), but the
  // players-table mirror (what the leaderboard and TV actually read) would
  // otherwise sit stale until the field is edited again.
  useEffect(() => {
    const timers = profileTimers.current;
    const pending = profilePending.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      for (const [field, value] of pending) void updateMe({ [field]: value });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush-on-unmount only
  }, []);

  async function next() {
    await flush();
    if (step < SECTIONS.length - 1) setStep(step + 1);
    else {
      await updateMe({ submitted_at: new Date().toISOString() });
      setDone(true);
    }
  }

  if (!me) return null;

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center pad-safe-t pad-safe-b">
        <div className="rise">
          <div className="text-6xl">{me.emoji}</div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight">
            Sealed.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-mute">
            {answered} answers locked away. Nobody can read them — not the other
            five, not Choolwe, not until the round they show up in.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-mute">
            You can come back and add more any time before{" "}
            {EVENT.surveyClosesLabel}.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-flame px-7 py-3 text-sm font-black tracking-tight text-ink active:brightness-90"
          >
            Back to the hub
          </Link>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mt-4 block w-full py-2 text-xs text-mute underline underline-offset-4"
          >
            Actually, let me add more
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="relative z-[2] mx-auto max-w-md px-5 pad-safe-t">
      {/* ── progress ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-5 bg-ink/90 px-5 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => void flush()}
            className="text-xs font-semibold text-mute"
            aria-label="Back to hub"
          >
            ← Hub
          </Link>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-3">
            <div
              className="h-full rounded-full bg-flame transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className="w-14 text-right text-[11px] font-semibold text-mute"
            aria-live="polite"
          >
            {saveState === "saving"
              ? "saving…"
              : saveState === "error"
                ? "retrying"
                : `${answered} in`}
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.title}
              onClick={async () => {
                await flush();
                setStep(i);
              }}
              className={`h-1 flex-1 rounded-full transition ${
                i === step ? "bg-paper" : i < step ? "bg-mute" : "bg-ink-3"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── section ──────────────────────────────────────────────── */}
      <section key={section.id} className="rise pb-8 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-mute">
          {step + 1} of {SECTIONS.length}
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black leading-tight tracking-tight">
          <span>{section.icon}</span>
          {section.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          {section.blurb}
        </p>

        <div className="mt-8 space-y-8">
          {!loaded && <p className="text-sm text-mute">loading your answers…</p>}

          {loaded &&
            section.questions.map((q) => {
              const slots = q.repeatable ?? 1;
              return (
                <div key={q.id}>
                  <label className="block text-base font-bold leading-snug">
                    {q.prompt}
                  </label>
                  {q.hint && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mute">
                      {q.hint}
                    </p>
                  )}
                  {q.anonymous && (
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet">
                      shown without your name
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    {Array.from({ length: slots }).map((_, i) => {
                      const v = answers[key(q.id, i)] ?? "";
                      // Repeatable slots appear one at a time: six empty boxes
                      // reads as homework, one box reads as a question.
                      if (
                        i > 0 &&
                        !v &&
                        !(answers[key(q.id, i - 1)] ?? "").trim()
                      )
                        return null;
                      return (
                        <Field
                          key={i}
                          q={q}
                          value={v}
                          onChange={(val) => handleChange(q.id, i, val)}
                        />
                      );
                    })}
                  </div>

                  {slots > 1 && (
                    <p className="mt-1.5 text-[11px] text-mute">
                      up to {slots} — a new box appears as you fill each one
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* ── dock ─────────────────────────────────────────────────── */}
      <div className="dock -mx-5 px-5">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={async () => {
                await flush();
                setStep(step - 1);
              }}
              className="rounded-full border border-line px-5 py-3.5 text-sm font-bold active:scale-95"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-full bg-flame py-3.5 text-base font-black tracking-tight text-ink active:brightness-90"
          >
            {step === SECTIONS.length - 1 ? "Seal it" : "Next"}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-mute">
          Skip anything. Everything saves as you type.
        </p>
      </div>
    </div>
  );
}
