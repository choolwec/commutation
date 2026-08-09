"use client";

import { useEffect, useRef } from "react";
import type { Question } from "@/config/survey";
import { usePlayer } from "@/lib/player";

const EMOJI = [
  "🔥","✨","👑","⚡","🦋","🌙","🍒","🐍","🎯","💀","🧊","🌶️",
  "🪩","🎲","🥀","🦂","🌊","🐺","🍯","👁️","🩸","🃏","🎭","🚬",
];

const COLORS = [
  "#ff5c39","#ffc247","#a855f7","#22d3ee","#10b981","#ef4444",
  "#6366f1","#ec4899","#84cc16","#f97316","#14b8a6","#f43f5e",
];

/** Textarea that grows with its content — phones have no room for scrollbars. */
function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(resize, [props.value]);
  return (
    <textarea
      {...props}
      ref={ref}
      rows={2}
      onInput={resize}
      className="w-full resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base leading-relaxed outline-none transition placeholder:text-mute/60 focus:border-flame/60"
    />
  );
}

export function Field({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const { roster } = usePlayer();

  switch (q.kind) {
    case "long":
      return (
        <AutoTextarea
          value={value}
          placeholder={q.placeholder ?? "…"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={q.prompt}
        />
      );

    case "short":
      return (
        <input
          type="text"
          value={value}
          placeholder={q.placeholder ?? "…"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={q.prompt}
          className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base outline-none transition placeholder:text-mute/60 focus:border-flame/60"
        />
      );

    case "choice":
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(value === o ? "" : o)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                value === o
                  ? "border-flame bg-flame text-ink"
                  : "border-line bg-ink-2 text-paper"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      );

    case "person":
      return (
        <div className="grid grid-cols-3 gap-2">
          {roster.map((p) => {
            const on = value === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(on ? "" : p.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition active:scale-95 ${
                  on ? "border-transparent" : "border-line bg-ink-2"
                }`}
                style={on ? { background: `${p.color}26`, borderColor: p.color } : undefined}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="text-xs font-semibold">{p.name}</span>
              </button>
            );
          })}
        </div>
      );

    case "emoji":
      return (
        <div className="grid grid-cols-6 gap-2">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange(e)}
              className={`grid aspect-square place-items-center rounded-xl border text-2xl transition active:scale-90 ${
                value === e ? "border-flame bg-flame/15" : "border-line bg-ink-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      );

    case "color":
      return (
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(c)}
              className={`aspect-square rounded-xl transition active:scale-90 ${
                value === c ? "ring-2 ring-paper ring-offset-2 ring-offset-ink" : ""
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      );

    case "scale": {
      const n = value === "" ? 50 : Number(value);
      return (
        <div>
          <input
            type="range"
            min={0}
            max={100}
            value={n}
            onChange={(e) => onChange(e.target.value)}
            className="w-full accent-flame"
            aria-label={q.prompt}
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-mute">
            <span>{q.scaleLabels?.[0]}</span>
            <span>{q.scaleLabels?.[1]}</span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
