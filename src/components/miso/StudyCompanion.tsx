import type { MisoPose } from "./MisoPortrait.tsx";
import { MisoPortrait } from "./MisoPortrait.tsx";

const LABELS: Record<MisoPose, string> = {
  idle: "Miso is waiting beside the card.",
  happy: "Miso looks happy.",
  success: "Miso looks proud.",
  studying: "Miso is watching you study.",
  sleeping: "Miso is resting.",
};

export function StudyCompanion({
  pose,
  equipped,
  showScore = false,
  correctCount = 0,
}: {
  pose: MisoPose;
  equipped: Record<string, string | undefined>;
  showScore?: boolean;
  correctCount?: number;
}) {
  return (
    <aside className="hidden w-[6.75rem] shrink-0 sm:block" aria-live="polite">
      <MisoPortrait
        key={pose}
        pose={pose}
        equipped={equipped}
        idle={pose === "idle"}
        className="miso-react w-full"
      />
      {showScore ? (
        <p className="mt-2 text-center text-sm font-bold tabular-nums text-ink">
          {String(correctCount)} correct
        </p>
      ) : null}
      <p className="sr-only">{LABELS[pose]}</p>
    </aside>
  );
}
