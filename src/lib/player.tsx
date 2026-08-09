"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ensureSession, getSupabase, isSupabaseConfigured } from "./supabase/client";

export type PlayerRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  hype_word: string | null;
  trash_talk: string | null;
  claimed_by: string | null;
  answers_count: number;
  submitted_at: string | null;
  sort_order: number;
};

type Ctx = {
  /** Every crew member, for the roster. Never contains answer content. */
  roster: PlayerRow[];
  /** The profile this device has claimed, if any. */
  me: PlayerRow | null;
  uid: string | null;
  loading: boolean;
  /** Null until we know; a string means setup is broken and we should say so. */
  error: string | null;
  configured: boolean;
  claim: (playerId: string) => Promise<boolean>;
  release: () => Promise<void>;
  updateMe: (patch: Partial<PlayerRow>) => Promise<void>;
  refresh: () => Promise<void>;
};

/** Exported so /preview can inject mock data and render the real components. */
export const PlayerContext = createContext<Ctx | null>(null);
export type PlayerCtx = Ctx;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [roster, setRoster] = useState<PlayerRow[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  // Derived, not stored: with no backend there's nothing to wait for, so we
  // go straight to the "finish your setup" screen instead of a spinner.
  const loading = configured ? fetching : false;
  const error = configured ? fetchError : "not-configured";

  const load = useCallback(async () => {
    const supabase = getSupabase();
    // No sync setState here: `configured` and `loading` are derived below
    // instead, which keeps this effect from cascading a render on mount.
    if (!supabase) return;

    const id = await ensureSession();
    setUid(id);

    const { data, error: err } = await supabase
      .from("players")
      .select(
        "id,name,emoji,color,hype_word,trash_talk,claimed_by,answers_count,submitted_at,sort_order",
      )
      .order("sort_order");

    if (err) {
      setFetchError(err.message);
    } else {
      setRoster(data ?? []);
      setFetchError(null);
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    // Fetch-on-mount. Every setState inside `load` runs after an await, so
    // there's no synchronous cascade here — the rule flags any effect that
    // reaches a setState at all, which this pattern unavoidably does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Safari drops the connection when the app is backgrounded. Re-reading the
  // roster on return is cheap and keeps the "who's done" indicator honest.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const me = useMemo(
    () => (uid ? (roster.find((p) => p.claimed_by === uid) ?? null) : null),
    [roster, uid],
  );

  const claim = useCallback(
    async (playerId: string) => {
      const supabase = getSupabase();
      if (!supabase || !uid) return false;

      // Goes through claim_profile() so a profile stranded by a cleared
      // Safari session can always be taken back — see migration 0002.
      const { error: rpcErr } = await supabase.rpc("claim_profile", {
        p_id: playerId,
      });

      if (rpcErr) {
        // Falls back to the plain update if 0002 hasn't been applied yet;
        // that path can only claim a profile nobody currently holds.
        const { data, error: err } = await supabase
          .from("players")
          .update({ claimed_by: uid, claimed_at: new Date().toISOString() })
          .eq("id", playerId)
          .is("claimed_by", null)
          .select();
        await load();
        return !err && (data?.length ?? 0) > 0;
      }

      await load();
      return true;
    },
    [uid, load],
  );

  const release = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !me) return;
    const { error: rpcErr } = await supabase.rpc("release_profile");
    if (rpcErr) {
      await supabase
        .from("players")
        .update({ claimed_by: null, claimed_at: null })
        .eq("id", me.id);
    }
    await load();
  }, [me, load]);

  const updateMe = useCallback(
    async (patch: Partial<PlayerRow>) => {
      const supabase = getSupabase();
      if (!supabase || !me) return;
      // Optimistic: the survey autosaves constantly and a round-trip per
      // keystroke would feel broken on a phone.
      setRoster((prev) =>
        prev.map((p) => (p.id === me.id ? { ...p, ...patch } : p)),
      );
      await supabase.from("players").update(patch).eq("id", me.id);
    },
    [me],
  );

  const value: Ctx = {
    roster,
    me,
    uid,
    loading,
    error,
    configured,
    claim,
    release,
    updateMe,
    refresh: load,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): Ctx {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}
