"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase/client";
import { usePlayer } from "./player";

/** Answers keyed `${questionId}:${answerIndex}`. */
export type AnswerMap = Record<string, string>;

export const key = (questionId: string, index = 0) => `${questionId}:${index}`;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Loads this player's own answers and autosaves edits.
 *
 * Saving is debounced per-field rather than per-keystroke: a phone on bad
 * wifi shouldn't fire a write for every letter, but nothing should ever be
 * lost either, so we also flush on blur and when the tab is backgrounded.
 */
export function useAnswers() {
  const { me, refresh } = usePlayer();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const pending = useRef<Map<string, string>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      // No backend (preview, or a broken deploy): fall back to local-only
      // state so the form still works rather than hanging on "loading".
      if (!supabase || !me) {
        setLoaded(true);
        return;
      }

      // RLS scopes this to the caller's own rows — there is no query a
      // client can write that returns somebody else's answers.
      const { data } = await supabase
        .from("survey_responses")
        .select("question_id,answer_index,value");

      if (cancelled) return;
      const map: AnswerMap = {};
      for (const r of data ?? []) {
        map[key(r.question_id, r.answer_index)] = r.value;
      }
      setAnswers(map);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  // ── flush ───────────────────────────────────────────────────────────
  const flush = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !me || pending.current.size === 0) return;

    const batch = Array.from(pending.current.entries());
    pending.current.clear();
    setSaveState("saving");

    const rows = batch.map(([k, value]) => {
      const idx = k.lastIndexOf(":");
      const questionId = k.slice(0, idx);
      const answerIndex = Number(k.slice(idx + 1));
      return {
        player_id: me.id,
        section_id: sectionOf(questionId),
        question_id: questionId,
        answer_index: answerIndex,
        value,
      };
    });

    const blanks = rows.filter((r) => r.value.trim() === "");
    const filled = rows.filter((r) => r.value.trim() !== "");

    let failed = false;

    // Clearing a field should delete the row, not store an empty string —
    // otherwise it counts toward progress and can surface as a blank card.
    for (const b of blanks) {
      const { error } = await supabase
        .from("survey_responses")
        .delete()
        .eq("player_id", b.player_id)
        .eq("question_id", b.question_id)
        .eq("answer_index", b.answer_index);
      if (error) failed = true;
    }

    if (filled.length) {
      const { error } = await supabase
        .from("survey_responses")
        .upsert(filled, { onConflict: "player_id,question_id,answer_index" });
      if (error) failed = true;
    }

    setSaveState(failed ? "error" : "saved");
    if (failed) {
      // Put them back so the next flush retries rather than dropping work.
      for (const [k, v] of batch) pending.current.set(k, v);
    } else {
      void refresh();
    }
  }, [me, refresh]);

  // ── set ─────────────────────────────────────────────────────────────
  const set = useCallback(
    (questionId: string, index: number, value: string) => {
      const k = key(questionId, index);
      setAnswers((prev) => ({ ...prev, [k]: value }));
      pending.current.set(k, value);
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 900);
    },
    [flush],
  );

  // Backgrounding Safari can suspend timers, so flush before that happens.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [flush]);

  return { answers, set, flush, loaded, saveState };
}

// Cheap lookup so callers don't have to pass the section around.
import { SECTIONS } from "@/config/survey";
const SECTION_OF: Record<string, string> = {};
for (const s of SECTIONS) for (const q of s.questions) SECTION_OF[q.id] = s.id;
function sectionOf(questionId: string) {
  return SECTION_OF[questionId] ?? "unknown";
}
