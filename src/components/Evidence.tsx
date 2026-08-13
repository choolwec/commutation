"use client";

import { useRef, useState } from "react";
import { useEvidence } from "@/lib/useEvidence";

/**
 * The surprise camera prompt. Mounted wherever a player might be looking
 * (Hub, /play) — see useEvidence's polling note for why it doesn't need to
 * be everywhere. Unlike survey answers, these photos are SHARED on purpose:
 * the recap gallery is the whole point, so there's no sealing here.
 */
export function Evidence() {
  const { due, submit } = useEvidence();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!due) return null;

  async function send() {
    if (files.length === 0) return;
    setBusy(true);
    const ok = await submit(files);
    setBusy(false);
    if (ok) setFiles([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm pad-safe-b">
      <div className="rise w-full max-w-md rounded-t-3xl border-t border-line bg-ink-2 p-6 pad-safe-b">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-flame">
          Evidence required
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">{due.prompt}</h2>
        <p className="mt-2 text-sm text-mute">
          Everyone sees these later tonight — this one&apos;s not sealed.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 w-full rounded-2xl border border-dashed border-line py-8 text-center active:scale-[0.98]"
        >
          <span className="block text-3xl">📸</span>
          <span className="mt-2 block text-sm font-semibold">
            {files.length > 0 ? `${files.length} photo(s) ready` : "Tap to take photos"}
          </span>
        </button>

        <button
          type="button"
          disabled={files.length === 0 || busy}
          onClick={send}
          className="mt-4 w-full rounded-2xl bg-flame px-5 py-4 text-base font-black text-ink active:brightness-90 disabled:opacity-40"
        >
          {busy ? "Uploading…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
