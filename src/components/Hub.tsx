"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlayer } from "@/lib/player";
import { EVENT } from "@/config/event";
import { TOTAL_QUESTIONS } from "@/config/survey";
import { Countdown } from "./Countdown";
import { Evidence } from "./Evidence";

// Files in public/ are copied verbatim and get no automatic rewriting — see
// layout.tsx's own BASE constant for why this has to be here too.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-mute">
        {label}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Hub() {
  const { me, roster, release } = usePlayer();

  const myProgress = me
    ? Math.min(100, Math.round((me.answers_count / TOTAL_QUESTIONS) * 100))
    : 0;
  const doneCount = useMemo(
    () => roster.filter((p) => p.answers_count > 0).length,
    [roster],
  );

  return (
    <main className="relative z-[2] mx-auto max-w-md px-5 pad-safe-t pb-24">
      {/* ── header ───────────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mute">
          {EVENT.name}
        </p>
        {me && (
          <span
            className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
            style={{ color: me.color }}
          >
            <span className="text-sm">{me.emoji}</span>
            {me.name}
          </span>
        )}
      </header>

      {/* ── hero ─────────────────────────────────────────────────── */}
      <img
        src={`${BASE}/art/hub-hero.webp`}
        alt=""
        className="rise mt-6 h-52 w-full rounded-3xl border border-line object-cover"
      />

      {/* ── countdown ────────────────────────────────────────────── */}
      <div className="rise mt-8 text-center">
        <p className="text-sm font-medium text-mute">
          {EVENT.dateLabel} · {EVENT.timeLabel}
        </p>
        <div className="mt-4">
          <Countdown />
        </div>
        <p className="mt-5 text-balance text-lg font-bold leading-snug">
          {EVENT.tagline}
        </p>
      </div>

      {/* ── the games ────────────────────────────────────────────── */}
      <Link
        href="/play"
        className="rise mt-10 flex items-center justify-between overflow-hidden rounded-3xl border border-line bg-ink-2 p-5 transition active:scale-[0.98]"
        style={{ animationDelay: "40ms" }}
      >
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
            🔒 📱 📺
          </span>
          <span className="mt-1 block text-lg font-black tracking-tight">
            The Vault · The Huddle · The Arena
          </span>
          <span className="mt-1 block text-xs text-mute">
            Unlocks automatically at {EVENT.timeLabel.split("–")[0].trim()}
          </span>
        </span>
        <span className="text-2xl text-mute">→</span>
      </Link>

      {/* ── the ask ──────────────────────────────────────────────── */}
      <div
        className="rise mt-6 overflow-hidden rounded-3xl border border-line bg-ink-2"
        style={{ animationDelay: "80ms" }}
      >
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
            {myProgress > 0 ? "Keep going" : "Do this first"}
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight">
            {myProgress > 0 ? "Your answers" : "Answer some questions"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Everything you write becomes a game on Saturday. Nothing is
            compulsory — skip anything you want. Nobody sees your answers
            before the day.{" "}
            <span className="text-paper/80">Not even Choolwe.</span>
          </p>

          {myProgress > 0 && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${myProgress}%`,
                    background: me?.color ?? "var(--color-flame)",
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-mute">
                {me?.answers_count} answered · closes {EVENT.surveyClosesLabel}
              </p>
            </div>
          )}
        </div>

        <Link
          href="/survey"
          className="block bg-flame px-5 py-4 text-center text-base font-black tracking-tight text-ink active:brightness-90"
        >
          {myProgress > 0 ? "Carry on →" : "Start →"}
        </Link>
      </div>

      {/* ── roster ───────────────────────────────────────────────── */}
      <Section label={`The crew · ${doneCount}/${roster.length} started`}>
        <ul className="space-y-2">
          {roster.map((p) => {
            const started = p.answers_count > 0;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-3"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
                  style={{ background: `${p.color}22` }}
                >
                  {p.emoji}
                </span>
                <span className="flex-1 text-sm font-semibold">{p.name}</span>
                {/* A count, never content — the pressure without the leak. */}
                <span
                  className="text-xs font-medium"
                  style={{ color: started ? p.color : undefined }}
                >
                  {started ? `${p.answers_count} in` : "nothing yet"}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── logistics ────────────────────────────────────────────── */}
      <Section label="Where">
        <div
          className={`rounded-2xl border bg-ink-2 p-4 ${
            EVENT.location.pending ? "border-dashed border-line" : "border-line"
          }`}
        >
          <p className="text-base font-bold">{EVENT.location.name}</p>
          <p className="mt-1 text-sm text-mute">{EVENT.location.address}</p>
          {EVENT.location.pending && (
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-gold">
              still being sorted — this page updates itself
            </p>
          )}
          {EVENT.location.note && (
            <p className="mt-2 text-sm text-mute">{EVENT.location.note}</p>
          )}
          {EVENT.location.mapsUrl && (
            <a
              href={EVENT.location.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-xs font-bold uppercase tracking-wider active:scale-95"
            >
              Open in maps
            </a>
          )}
        </div>
      </Section>

      <Section label="Roughly">
        <ol className="space-y-1.5">
          {EVENT.schedule.map((s) => (
            <li
              key={s.time}
              className="flex gap-4 rounded-xl px-1 py-1.5 text-sm"
            >
              <span className="w-20 shrink-0 font-bold tabular-nums text-mute">
                {s.time}
              </span>
              <span>{s.what}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Bring">
        <ul className="space-y-1.5">
          {EVENT.bring.map((b) => (
            <li key={b} className="flex gap-3 text-sm">
              <span className="text-flame">·</span>
              {b}
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Evidence">
        <div className="space-y-2">
          <Link
            href="/recap"
            className="flex items-center justify-between rounded-2xl border border-line bg-ink-2 px-4 py-3 active:scale-[0.98]"
          >
            <span className="text-sm font-semibold">Photo recap</span>
            <span className="text-mute">→</span>
          </Link>
          <Link
            href="/awards"
            className="flex items-center justify-between rounded-2xl border border-line bg-ink-2 px-4 py-3 active:scale-[0.98]"
          >
            <span className="text-sm font-semibold">🏆 Awards</span>
            <span className="text-mute">→</span>
          </Link>
        </div>
      </Section>

      {/* ── install prompt ───────────────────────────────────────── */}
      <Section label="One more thing">
        <div className="rounded-2xl border border-dashed border-line p-4">
          <p className="text-sm leading-relaxed">
            <span className="font-bold">Add this to your Home Screen.</span>{" "}
            Share button → <em>Add to Home Screen</em>. It opens fullscreen, and
            it means you won&apos;t lose your place on Saturday.
          </p>
        </div>
      </Section>

      {me && (
        <button
          type="button"
          onClick={() => {
            if (confirm(`Hand back ${me.name}? Your answers stay saved.`))
              void release();
          }}
          className="mt-10 w-full py-3 text-xs font-medium text-mute underline underline-offset-4"
        >
          Not {me.name}?
        </button>
      )}

      {me?.id === "choolwe" && (
        <Link
          href="/test"
          className="mt-6 block w-full rounded-2xl border border-dashed border-line py-3 text-center text-xs font-bold text-mute active:scale-[0.98]"
        >
          🧪 Test the games (before Saturday, fake data only)
        </Link>
      )}

      <Evidence />
    </main>
  );
}
