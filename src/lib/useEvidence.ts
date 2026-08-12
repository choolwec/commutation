"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "@/lib/player";
import { getSupabase } from "@/lib/supabase/client";

/**
 * EVIDENCE — the random photo prompts.
 *
 * `evidence_prompts` rows are generated once, for the whole day, the moment
 * the host schedules it (see supabase/migrations/0007's schedule_evidence).
 * Nobody — including this device — knows in advance which of its own rows
 * is next; that's the point. This hook just polls "do I have a prompt whose
 * time has come" every 15s while the app is open. Not realtime-subscribed:
 * a 15s worst-case delay on a surprise camera prompt is unnoticeable and
 * avoids yet another postgres_changes channel running all day on a phone
 * that's supposed to be at a party, not managing sockets.
 */

export type EvidencePrompt = {
  id: string;
  due_at: string;
  prompt: string;
  status: "pending" | "done" | "missed";
};

export function useEvidence() {
  const { me } = usePlayer();
  const [due, setDue] = useState<EvidencePrompt | null>(null);

  const check = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !me) return;
    const { data } = await supabase
      .from("evidence_prompts")
      .select("id,due_at,prompt,status")
      .eq("player_id", me.id)
      .eq("status", "pending")
      .lte("due_at", new Date().toISOString())
      .order("due_at")
      .limit(1)
      .maybeSingle();
    setDue((data as EvidencePrompt | null) ?? null);
  }, [me]);

  useEffect(() => {
    // Fetch-on-mount, same pattern as player.tsx's `load()` — every setState
    // inside `check` runs after an await, so there's no synchronous cascade,
    // just the rule flagging any effect that reaches a setState at all.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    const id = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [check]);

  const submit = useCallback(
    async (files: File[]) => {
      const supabase = getSupabase();
      if (!supabase || !me || !due) return false;

      for (const file of files) {
        const jpeg = await toJpeg(file);
        const path = `${me.id}/${due.id}-${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("evidence")
          .upload(path, jpeg, { contentType: "image/jpeg" });
        if (upErr) return false;
        await supabase
          .from("evidence_photos")
          .insert({ prompt_id: due.id, player_id: me.id, path });
      }

      await supabase.rpc("complete_evidence", { p_prompt: due.id });
      setDue(null);
      return true;
    },
    [me, due],
  );

  return { due, submit, dismissCheck: check };
}

/**
 * Re-encodes to JPEG at a phone-friendly size, regardless of the source
 * format. iPhones mostly hand a live camera capture back as JPEG already,
 * but the Photos library defaults to HEIC — this makes the app not care
 * which one it got, and keeps the free Supabase Storage tier comfortable
 * (see HANDOFF's storage note) instead of uploading full-resolution originals.
 */
async function toJpeg(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // format the browser can't decode — upload as-is

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82);
  });
}
