import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { RecapGallery } from "@/components/RecapGallery";

export const metadata = {
  title: "Recap · Commutation",
};

export default function RecapPage() {
  return (
    <PlayerProvider>
      <Gate>
        <RecapGallery />
      </Gate>
    </PlayerProvider>
  );
}
