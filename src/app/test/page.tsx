import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { RoomProvider } from "@/lib/game/room";
import { TestRoom } from "@/components/play/TestRoom";

export const metadata = {
  title: "Test · Commutation",
};

/**
 * Deliberately skips <PlayGate> — that's the whole point, testing needs to
 * work before the countdown hits zero. Still behind <Gate>, so it's only
 * reachable by someone who's claimed one of the six profiles. See
 * TestRoom.tsx and migration 0011 for how this stays safe to use early.
 */
export default function TestPage() {
  return (
    <PlayerProvider>
      <Gate>
        <RoomProvider>
          <TestRoom />
        </RoomProvider>
      </Gate>
    </PlayerProvider>
  );
}
