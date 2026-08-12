import { PlayerProvider } from "@/lib/player";
import { RoomProvider } from "@/lib/game/room";
import { TvRoom } from "@/components/play/TvRoom";

export const metadata = {
  title: "TV · Commutation",
};

/**
 * The laptop-on-the-TV route. Deliberately skips <Gate> — the TV isn't a
 * player and shouldn't be asked to claim one of the six profiles, it just
 * needs a Supabase session to read the room (PlayerProvider still signs in
 * anonymously under the hood for that).
 */
export default function TvPage() {
  return (
    <PlayerProvider>
      <RoomProvider>
        <TvRoom />
      </RoomProvider>
    </PlayerProvider>
  );
}
