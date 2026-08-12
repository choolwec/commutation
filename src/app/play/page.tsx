import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { RoomProvider } from "@/lib/game/room";
import { PlayGate } from "@/components/play/PlayGate";
import { PlayRoom } from "@/components/play/PlayRoom";

export const metadata = {
  title: "Play · Commutation",
};

export default function PlayPage() {
  return (
    <PlayerProvider>
      <Gate>
        <RoomProvider>
          <PlayGate>
            <PlayRoom />
          </PlayGate>
        </RoomProvider>
      </Gate>
    </PlayerProvider>
  );
}
