"use client";

import { usePlayer } from "@/lib/player";
import { useRoom, useCurrentItems } from "@/lib/game/room";
import type { GameModule } from "@/lib/game/types";
import { GameShell, PrimaryButton, WaitingOnHost } from "@/components/play/GameShell";
import { PersonVote } from "@/components/play/PersonVote";
import { SPYFALL_LOCATIONS } from "@/config/decks";

/**
 * SPYFALL — every phone shows the same location + a role; one shows
 * "you're the spy." Question each other, then vote.
 *
 * Dealt via deal_roles() (0007): Postgres — not the host's device — decides
 * who gets the spy card, so the host can play too without knowing the
 * answer. Each non-spy phone's `round_items` row carries a role variant in
 * `meta.role`; the spy's row never gets one, which is how the phone tells
 * the two cards apart without ever needing to know its own identity's
 * assignment — it just renders whatever Postgres sent it.
 */

const SPY_CARD =
  "You're the SPY. Blend in — figure out the location from how everyone else answers.";

function RoleCard({
  isSpy,
  content,
  role,
}: {
  isSpy: boolean;
  content: string;
  role?: string;
}) {
  return (
    <div
      className={`rise rounded-3xl border p-6 text-center ${
        isSpy ? "border-flame bg-flame/10" : "border-line bg-ink-2"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${
          isSpy ? "text-flame" : "text-mute"
        }`}
      >
        {isSpy ? "You're the spy" : "Location"}
      </p>
      <p className="mt-2 text-lg font-black leading-snug">{content}</p>
      {role && (
        <p className="mt-3 text-sm text-mute">
          Your role: <span className="font-semibold text-paper">{role}</span>
        </p>
      )}
    </div>
  );
}

function RevealPanel({ idx }: { idx: number }) {
  const { roster } = usePlayer();
  const { votes, secrets } = useRoom();
  const secret = secrets.find((s) => s.idx === idx);
  const spy = roster.find((p) => p.id === secret?.author);
  const location = (secret?.payload as { shared?: string } | undefined)?.shared;
  const roundVotes = votes.filter((v) => v.idx === idx);
  const caught = roundVotes.filter((v) => v.value === secret?.author).length;
  const survived = secret?.author ? caught * 2 <= roundVotes.length : false;

  return (
    <div className="rise space-y-4 text-center">
      {spy ? (
        <div
          className="inline-flex flex-col items-center gap-2 rounded-3xl border px-6 py-5"
          style={{ borderColor: spy.color, background: `${spy.color}18` }}
        >
          <span className="text-3xl">{spy.emoji}</span>
          <span className="text-xl font-black">{spy.name}</span>
          <span className="text-xs text-mute">was the spy</span>
        </div>
      ) : (
        <p className="text-mute">No spy was dealt.</p>
      )}
      {location && (
        <p className="text-sm text-mute">
          The location was <span className="font-semibold text-paper">{location}</span>
        </p>
      )}
      <p className="text-sm text-mute">
        {caught} of {roundVotes.length} correctly voted the spy —{" "}
        {survived ? `${spy?.name ?? "the spy"} survived and earns +250` : "the room caught them"}
      </p>
    </div>
  );
}

function Phone() {
  const { me } = usePlayer();
  const { round, isHost, call } = useRoom();
  const item = useCurrentItems().find((i) => i.kind === "role");

  if (!round || !item) {
    return (
      <GameShell icon="🕵️" title="Spyfall">
        <WaitingOnHost label="Dealing the location…" />
      </GameShell>
    );
  }

  const role = typeof item.meta?.role === "string" ? (item.meta.role as string) : undefined;
  const isSpy = !role;
  const voting = round.phase === "vote";
  const revealed = round.phase === "reveal" || round.phase === "done";
  const isDone = round.phase === "done";

  async function toVote() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "vote" });
  }

  async function reveal() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "reveal" });
    await call("score_odd_one_out", { p_round: round.id });
  }

  async function finish() {
    if (!round) return;
    await call("set_phase", { p_round: round.id, p_phase: "done" });
  }

  return (
    <GameShell
      icon="🕵️"
      title="Spyfall"
      subtitle={
        revealed ? "Revealed" : voting ? "Vote for the spy" : "Question each other"
      }
      dock={
        isHost && !isDone ? (
          <div className="flex gap-2 pt-3">
            {!voting && !revealed && (
              <PrimaryButton onClick={() => void toVote()}>Time to vote</PrimaryButton>
            )}
            {voting && (
              <PrimaryButton onClick={() => void reveal()}>Reveal</PrimaryButton>
            )}
            {revealed && (
              <PrimaryButton onClick={() => void finish()}>Finish round</PrimaryButton>
            )}
          </div>
        ) : undefined
      }
    >
      {!voting && !revealed && (
        <>
          <RoleCard isSpy={isSpy} content={item.content} role={role} />
          <p className="mt-4 text-center text-sm text-mute">
            Ask each other questions about the location. When you&apos;re ready, vote
            for the spy.
          </p>
        </>
      )}

      {voting && (
        <>
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-mute">
            Who&apos;s the spy?
          </p>
          <PersonVote idx={0} exclude={me ? [me.id] : []} />
        </>
      )}

      {revealed && <RevealPanel idx={0} />}
    </GameShell>
  );
}

export const spyfall: GameModule = {
  id: "spyfall",
  title: "Spyfall",
  hall: "huddle",
  icon: "🕵️",
  blurb: "Everyone shares a location — except the spy. Question, then vote.",
  source: { kind: "roles" },
  minutes: 10,
  async start({ call }) {
    const location =
      SPYFALL_LOCATIONS[Math.floor(Math.random() * SPYFALL_LOCATIONS.length)];

    const roundId = (await call("start_deck_round", {
      p_game: "spyfall",
      p_hall: "huddle",
    })) as string;

    await call("deal_roles", {
      p_round: roundId,
      p_shared_content: location.location,
      p_odd_content: SPY_CARD,
      p_role_variants: location.roles,
      p_odd_count: 1,
    });
  },
  PhoneView: Phone,
};
