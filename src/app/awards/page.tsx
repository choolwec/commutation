import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { RoomProvider } from "@/lib/game/room";
import { Awards } from "@/components/Awards";

export const metadata = {
  title: "Awards · Commutation",
};

export default function AwardsPage() {
  return (
    <PlayerProvider>
      <Gate>
        <RoomProvider>
          <Awards />
        </RoomProvider>
      </Gate>
    </PlayerProvider>
  );
}
