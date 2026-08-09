import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { Hub } from "@/components/Hub";

export default function Home() {
  return (
    <PlayerProvider>
      <Gate>
        <Hub />
      </Gate>
    </PlayerProvider>
  );
}
