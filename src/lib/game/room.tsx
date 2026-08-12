"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import { usePlayer } from "@/lib/player";
import { useNow } from "@/lib/useNow";
import type {
  GameRoom,
  LeaderRow,
  Round,
  RoundEvent,
  RoundItem,
  RoundSecret,
  Submission,
  Vote,
} from "./types";

/**
 * THE ROOM.
 *
 * One provider holding everything six phones and a TV need to agree on.
 *
 * Sync strategy is deliberately blunt: any change to any game table triggers
 * a refetch of the whole round, rather than applying events incrementally.
 * That's not laziness, it's the only correct option here — Postgres RLS
 * filters realtime events per subscriber, so a row you couldn't see when it
 * was inserted (a sealed author, someone else's vote) generates NO event
 * when the reveal later makes it visible. The phase change is the signal to
 * re-read everything. Incremental application would silently miss the exact
 * moment every reveal in the app depends on.
 *
 * At seven clients the cost is irrelevant.
 */

type Ctx = {
  room: GameRoom | null;
  round: Round | null;
  items: RoundItem[];
  secrets: RoundSecret[];
  submissions: Submission[];
  votes: Vote[];
  events: RoundEvent[];
  leaderboard: LeaderRow[];
  loading: boolean;
  isHost: boolean;
  /** Server-side truth, not this device's clock. */
  unlocked: boolean;
  tvConnected: boolean;

  refresh: () => Promise<void>;
  call: (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
};

const RoomContext = createContext<Ctx | null>(null);

/** A TV that hasn't checked in for two minutes is a TV that got unplugged. */
const TV_STALE_MS = 2 * 60 * 1000;

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { me } = usePlayer();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [items, setItems] = useState<RoundItem[]>([]);
  const [secrets, setSecrets] = useState<RoundSecret[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Six people voting at once fires six events. Without this they'd each
  // trigger a full refetch, so the last one lands while five are in flight
  // and the UI flickers through stale states.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: roomRow } = await supabase
      .from("game_room")
      .select("id,host_player,unlocked_at,active_round,tv_seen_at")
      .eq("id", "commutation")
      .maybeSingle();

    setRoom((roomRow as GameRoom) ?? null);

    const { data: board } = await supabase
      .from("leaderboard")
      .select("id,name,emoji,color,points");
    setLeaderboard((board as LeaderRow[]) ?? []);

    const activeId = (roomRow as GameRoom | null)?.active_round;
    if (!activeId) {
      setRound(null);
      setItems([]);
      setSecrets([]);
      setSubmissions([]);
      setVotes([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: roundRow } = await supabase
      .from("rounds")
      .select(
        "id,game,hall,phase,subject,config,item_cursor,show_submissions,show_votes,started_at,is_test,created_at,ended_at",
      )
      .eq("id", activeId)
      .maybeSingle();

    setRound((roundRow as Round) ?? null);

    // Each of these comes back already filtered by RLS. An empty secrets
    // array before the reveal isn't a bug — it's the guarantee working.
    const [itemsRes, secretsRes, subsRes, votesRes, eventsRes] = await Promise.all([
      supabase
        .from("round_items")
        .select("id,round_id,idx,kind,content,visible_to,meta")
        .eq("round_id", activeId)
        .order("idx"),
      supabase
        .from("round_secrets")
        .select("id,round_id,item_id,idx,author,payload")
        .eq("round_id", activeId),
      supabase
        .from("submissions")
        .select("id,round_id,player_id,idx,kind,value,created_at")
        .eq("round_id", activeId),
      supabase
        .from("votes")
        .select("id,round_id,player_id,idx,value,created_at")
        .eq("round_id", activeId),
      supabase
        .from("round_events")
        .select("id,round_id,idx,player_id,kind,value,created_at")
        .eq("round_id", activeId)
        .order("created_at"),
    ]);

    setItems((itemsRes.data as RoundItem[]) ?? []);
    setSecrets((secretsRes.data as RoundSecret[]) ?? []);
    setSubmissions((subsRes.data as Submission[]) ?? []);
    setVotes((votesRes.data as Vote[]) ?? []);
    setEvents((eventsRes.data as RoundEvent[]) ?? []);
    setLoading(false);
  }, []);

  const schedule = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => void load(), 120);
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel("room:commutation")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_room" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_items" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_events" },
        schedule,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [schedule]);

  // iOS kills the WebSocket the moment Safari is backgrounded, and does it
  // silently — the socket looks alive and delivers nothing. Assume every
  // return to the app has missed events and resync from Postgres. This is
  // the difference between a phone that rejoins the round correctly and one
  // that sits on a screen the rest of the room left five minutes ago.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [load]);

  const call = useCallback(
    async (fn: string, args: Record<string, unknown> = {}) => {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw new Error(error.message);
      await load();
      return data;
    },
    [load],
  );

  // Date.now() is impure, so it's read through useNow()'s external-store
  // subscription (same fix Countdown.tsx already needed) rather than called
  // directly here — the React Compiler treats a bare Date.now() in a
  // component body as a purity violation, not just inside useMemo.
  const now = useNow(5000) ?? 0;
  const unlocked = room?.unlocked_at
    ? new Date(room.unlocked_at).getTime() <= now
    : false;

  const tvConnected = room?.tv_seen_at
    ? now - new Date(room.tv_seen_at).getTime() < TV_STALE_MS
    : false;

  const value: Ctx = {
    room,
    round,
    items,
    secrets,
    submissions,
    votes,
    events,
    leaderboard,
    loading,
    isHost: Boolean(me && room?.host_player === me.id),
    unlocked,
    tvConnected,
    refresh: load,
    call,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): Ctx {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}

/** The items this phone is allowed to see for the current cursor position. */
export function useCurrentItems(): RoundItem[] {
  const { items, round } = useRoom();
  const cursor = round?.item_cursor ?? 0;
  return useMemo(
    () => items.filter((i) => i.idx === cursor),
    [items, cursor],
  );
}
