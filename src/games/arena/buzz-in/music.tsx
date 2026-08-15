"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";
import { useRoom } from "@/lib/game/room";
import { getSupabase } from "@/lib/supabase/client";
import type { GameModule, GameViewProps } from "@/lib/game/types";
import { TvShell, TvFlash } from "@/components/play/TvShell";
import { NAME_THAT_TUNE } from "@/config/name-that-tune";
import {
  BuzzButton,
  BuzzHost,
  useBuzzState,
  useCurrentItems,
  useTotalItems,
  WaitingOnHost,
} from "./shared";

/**
 * BUZZ IN: NAME THAT TUNE — violet/magenta, nightclub, a spinning vinyl.
 *
 * The clip streams live from Apple's own servers (resolved once at deal
 * time — see start() below), never hosted by this app. See
 * src/config/name-that-tune.ts for the full reasoning.
 *
 * Deliberately visually distinct from the Trivia variant of this same
 * mechanic: different glow color, a spinning-record motif instead of a
 * quiz-show board, audio bars instead of multiple-choice tiles.
 *
 * TV BOARD: the reveal is deliberately gated on the WINNER'S OWN action, not
 * the host's. Whoever buzzed in says the song out loud, and only once they
 * tap "I've guessed" on their own phone does the title/artist/cover art
 * appear on the TV — that's the suspense the room is actually watching for.
 * Same round_events primitive Trivia's "ruled" event and Contact's contacts
 * use: a public, self-inserted, timestamped row (kind: "guessed") the TV
 * gates its reveal on, rather than any client-only state.
 */

const GLOW = "#a855f7"; // --color-violet

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type TuneMeta = { title: string; artist: string; previewUrl: string; artworkUrl: string | undefined };

function Vinyl({ spinning }: { spinning: boolean }) {
  return (
    <div
      className={`grid h-28 w-28 place-items-center rounded-full border-4 border-line bg-ink ${
        spinning ? "motion-safe:animate-[spin_3s_linear_infinite]" : ""
      }`}
      style={{
        background:
          "repeating-radial-gradient(circle, #1a1723 0px, #1a1723 3px, #100e17 4px, #100e17 6px)",
      }}
    >
      <div className="h-8 w-8 rounded-full" style={{ background: GLOW }} />
    </div>
  );
}

function Phone() {
  const { me, roster } = usePlayer();
  const { round, events, isHost, call } = useRoom();
  const item = useCurrentItems()[0];
  const total = useTotalItems();
  const { winner, locked, iAmWinner, buzz, buzzing } = useBuzzState();
  const [ruled, setRuled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const meta = item?.meta as Partial<TuneMeta> | undefined;
  const winnerName = roster.find((p) => p.id === winner?.player_id)?.name;
  const cursor = round?.item_cursor ?? 0;
  const guessed = events.some((e) => e.idx === cursor && e.kind === "guessed");

  async function iveGuessed() {
    const supabase = getSupabase();
    if (!supabase || !round || !me || guessing) return;
    setGuessing(true);
    await supabase.from("round_events").insert({
      round_id: round.id,
      idx: cursor,
      player_id: me.id,
      kind: "guessed",
    });
    setGuessing(false);
  }

  // Only the host's device plays the clip out loud — six phones each
  // starting their own copy of the same song, slightly out of phase, would
  // be worse than useless. Everyone else just watches the buzzer.
  function playClip() {
    if (!isHost || !meta?.previewUrl) return;
    const audio = audioRef.current ?? new Audio();
    // `playing` mirrors the element's own pause/ended events rather than
    // being set at every call site — an effect that wants the clip stopped
    // can just call .pause() (an external-system update, not a setState)
    // and let the event bring React's copy of the state back in sync.
    audio.onpause = () => setPlaying(false);
    audio.onended = () => setPlaying(false);
    audio.src = meta.previewUrl;
    audio.play().then(() => setPlaying(true)).catch(() => {});
    audioRef.current = audio;
  }
  function stopClip() {
    audioRef.current?.pause();
  }
  useEffect(() => {
    if (locked) stopClip();
  }, [locked]);
  useEffect(() => stopClip, [round?.item_cursor]);

  async function rule(correct: boolean) {
    if (!round || !winner) return;
    setRuled(true);
    await call("award_points", {
      p_player: winner.player_id,
      p_points: correct ? 150 : -25,
      p_reason: "buzz_in_music",
      p_round: round.id,
    });
  }
  async function next() {
    if (!round) return;
    setRuled(false);
    stopClip();
    await call("set_cursor", { p_round: round.id, p_cursor: round.item_cursor + 1 });
  }
  async function finish() {
    if (!round) return;
    stopClip();
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  if (!round || !item) {
    return <WaitingOnHost label="Loading clips…" />;
  }

  return (
    <BuzzHost
      title="Buzz In · Name That Tune"
      cursor={round.item_cursor}
      total={total}
      glow={GLOW}
      isHost={isHost}
      onNext={next}
      onFinish={finish}
    >
      <div className="flex flex-col items-center gap-6">
        <Vinyl spinning={playing} />

        {isHost && !locked && (
          <button
            type="button"
            onClick={playing ? stopClip : playClip}
            className="rounded-full px-6 py-2 text-sm font-bold text-ink active:scale-95"
            style={{ background: GLOW }}
          >
            {playing ? "⏸ Pause" : "▶ Play clip"}
          </button>
        )}
        {!isHost && !locked && (
          <p className="text-sm text-mute">Playing on the host&apos;s device…</p>
        )}

        {!locked ? (
          <BuzzButton locked={locked} iAmWinner={iAmWinner} onBuzz={() => void buzz()} glow={GLOW} />
        ) : (
          <div className="rise text-center">
            <p className="text-2xl font-black" style={{ color: GLOW }}>
              {winnerName ?? "Someone"} buzzed first!
            </p>
            {!iAmWinner && (
              <p className="mt-2 text-sm text-mute">
                {guessed ? "Check the TV." : "Waiting for them to say it…"}
              </p>
            )}
            {iAmWinner && !guessed && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-mute">Say it out loud, then tap when you&apos;re done.</p>
                <button
                  type="button"
                  onClick={() => void iveGuessed()}
                  disabled={guessing}
                  className="rounded-full px-8 py-3 text-sm font-black uppercase tracking-wide text-ink active:scale-95 disabled:opacity-50"
                  style={{ background: GLOW }}
                >
                  {guessing ? "…" : "I've guessed →"}
                </button>
              </div>
            )}
            {iAmWinner && guessed && (
              <p className="mt-2 text-sm text-mute">On the TV now — check the room.</p>
            )}
          </div>
        )}
        {buzzing && <p className="text-xs text-mute">buzzing…</p>}
      </div>

      {isHost && locked && !ruled && meta?.title && (
        <div className="rise mt-6 space-y-2">
          <p className="text-center text-sm text-mute">
            It was <span className="font-bold text-paper">“{meta.title}”</span> —{" "}
            {meta.artist}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void rule(true)}
              className="flex-1 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 py-3 text-sm font-bold text-emerald-300 active:scale-95"
            >
              ✓ Got it (+150)
            </button>
            <button
              type="button"
              onClick={() => void rule(false)}
              className="flex-1 rounded-2xl border border-flame/50 bg-flame/10 py-3 text-sm font-bold text-flame active:scale-95"
            >
              ✗ Wrong (−25)
            </button>
          </div>
        </div>
      )}
    </BuzzHost>
  );
}

function TvVinyl({ spinning, artworkUrl }: { spinning: boolean; artworkUrl?: string }) {
  return (
    <div
      className={`relative grid h-72 w-72 place-items-center rounded-full border-8 border-line bg-ink shadow-2xl ${
        spinning ? "motion-safe:animate-[spin_4s_linear_infinite]" : ""
      }`}
      style={{
        background:
          "repeating-radial-gradient(circle, #1a1723 0px, #1a1723 8px, #100e17 9px, #100e17 14px)",
      }}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          className="h-32 w-32 rounded-full border-4 object-cover"
          style={{ borderColor: GLOW }}
        />
      ) : (
        <div className="h-24 w-24 rounded-full" style={{ background: GLOW }} />
      )}
    </div>
  );
}

function Tv({ round }: GameViewProps) {
  const { roster } = usePlayer();
  const { events, items } = useRoom();
  const cursor = round.item_cursor;
  const item = items.find((i) => i.idx === cursor);
  const meta = item?.meta as Partial<TuneMeta> | undefined;

  const here = events.filter((e) => e.idx === cursor);
  const buzz = here.find((e) => e.kind === "buzz") ?? null;
  const guessed = here.some((e) => e.kind === "guessed");
  const winnerName = roster.find((p) => p.id === buzz?.player_id)?.name;

  if (!meta?.title) {
    return (
      <TvShell icon="🎧" title="Buzz In · Name That Tune" accent={GLOW} gameId="buzz_in_music">
        <p className="text-3xl font-bold text-mute">Cueing up the next one…</p>
      </TvShell>
    );
  }

  return (
    <TvShell icon="🎧" title="Buzz In · Name That Tune" accent={GLOW} gameId="buzz_in_music">
      <TvVinyl spinning={!buzz} artworkUrl={guessed ? meta.artworkUrl : undefined} />

      {!buzz && <p className="text-xl text-mute">Buzzers are live…</p>}

      {buzz && !guessed && (
        <TvFlash accent={GLOW}>{winnerName ?? "Someone"} buzzed first!</TvFlash>
      )}

      {guessed && (
        <div className="rise">
          <p className="text-5xl font-black leading-tight">“{meta.title}”</p>
          <p className="mt-3 text-2xl font-bold text-mute">{meta.artist}</p>
        </div>
      )}
    </TvShell>
  );
}

export const buzzInMusic: GameModule = {
  id: "buzz_in_music",
  title: "Buzz In: Name That Tune",
  hall: "arena",
  icon: "🎧",
  blurb: "A clip plays. First to buzz names the song.",
  source: { kind: "deck" },
  requiresTv: true,
  minutes: 10,
  async start({ call }) {
    const picked = shuffle(NAME_THAT_TUNE).slice(0, 10);
    const resolved = await Promise.all(
      picked.map(async (t) => {
        try {
          const term = encodeURIComponent(`${t.title} ${t.artist}`);
          const res = await fetch(
            `https://itunes.apple.com/search?term=${term}&media=music&limit=1`,
          );
          const json = await res.json();
          const previewUrl = json?.results?.[0]?.previewUrl as string | undefined;
          // iTunes only serves a 100x100 thumbnail by default — the URL
          // itself encodes the size, so asking for the same file at
          // 600x600 is just a string swap, no extra request.
          const artworkUrl100 = json?.results?.[0]?.artworkUrl100 as string | undefined;
          const artworkUrl = artworkUrl100?.replace("100x100bb", "600x600bb");
          return previewUrl ? { ...t, previewUrl, artworkUrl } : null;
        } catch {
          return null;
        }
      }),
    );
    const items = resolved.filter((t): t is TuneMeta => t !== null);

    if (items.length < 3) {
      throw new Error(
        "Couldn't load enough clips — check the connection and try again.",
      );
    }

    const roundId = await call("start_deck_round", {
      p_game: "buzz_in_music",
      p_hall: "arena",
    });
    await call("deal_deck", {
      p_round: roundId,
      p_items: items.map((t) => ({ content: "tune", meta: t })),
    });
  },
  PhoneView: Phone,
  TvView: Tv,
};
