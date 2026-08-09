import { PlayerProvider } from "@/lib/player";
import { Gate } from "@/components/Gate";
import { Survey } from "@/components/survey/Survey";

export const metadata = {
  title: "Your answers · Commutation",
};

export default function SurveyPage() {
  return (
    <PlayerProvider>
      <Gate>
        <Survey />
      </Gate>
    </PlayerProvider>
  );
}
