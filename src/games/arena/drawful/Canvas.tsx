"use client";

import { useEffect, useRef, useState } from "react";

const PALETTE = ["#f4f1ea", "#ff5c39", "#ffc247", "#22d3ee", "#a855f7", "#08070c"];

/**
 * A finger-drawing canvas. `touch-action: none` is load-bearing, not
 * decoration — per PLAN.md, without it a stray scroll gesture mid-stroke
 * fights the browser for the touch and the line breaks. Pointer Events
 * (not touch/mouse separately) so the same handlers work whether this ever
 * gets tested on a laptop trackpad or a real iPhone.
 */
export function Canvas({ onDone }: { onDone: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(PALETTE[0]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Paper-colored fill on mount — a blank transparent canvas would export a
  // black square once flattened to JPEG (no alpha channel), which is a
  // useless "drawing" for every guesser downstream.
  useEffect(clear, []);

  return (
    <div className="rise space-y-3">
      <canvas
        ref={ref}
        width={320}
        height={220}
        style={{ touchAction: "none" }}
        className="w-full rounded-2xl border-2 border-line bg-paper"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-7 w-7 rounded-full border-2 transition active:scale-90 ${
                color === c ? "border-flame" : "border-line"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-bold active:scale-95"
        >
          Clear
        </button>
      </div>
      <button
        type="button"
        onClick={() => ref.current && onDone(ref.current.toDataURL("image/jpeg", 0.7))}
        className="w-full rounded-2xl px-5 py-4 text-base font-black text-ink active:brightness-90"
        style={{ background: "#f97316" }}
      >
        Submit drawing
      </button>
    </div>
  );
}
