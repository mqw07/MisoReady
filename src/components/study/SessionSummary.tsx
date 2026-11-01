import { appPaths } from "../../routes.ts";
import type { SessionKind } from "../../features/study/params.ts";
import { ratingCounts } from "../../features/study/engine.ts";
import type { ReviewRating } from "../../types/domain.ts";
import { formatCardCount, formatPoints } from "../../utils/format.ts";
import { ButtonLink } from "../ui/Button.tsx";
import { Panel } from "../ui/Panel.tsx";

const LABELS: Record<ReviewRating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export function SessionSummary({
  kind,
  ratings,
  pointsEarned = 0,
  recallCorrect,
}: {
  kind: SessionKind;
  ratings: readonly ReviewRating[];
  pointsEarned?: number;
  recallCorrect?: number;
}) {
  const counts = ratingCounts(ratings);
  return (
    <Panel className="px-6 py-8">
      <h2 className="text-2xl text-ink">Session complete</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {kind === "custom"
          ? `${formatCardCount(ratings.length)} practiced. Ratings were recorded. Schedules did not change.`
          : `${formatCardCount(ratings.length)} reviewed. Each rating updated the shared study schedule.`}
        {pointsEarned > 0 ? ` ${formatPoints(pointsEarned)} earned.` : null}
        {typeof recallCorrect === "number" ? ` ${String(recallCorrect)} correct.` : null}
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {(["again", "hard", "good", "easy"] as const).map((rating) => (
          <li key={rating} className="flex justify-between rounded-2xl bg-surface-sunken px-4 py-3 text-sm font-bold">
            <span>{LABELS[rating]}</span>
            <span className="tabular-nums">{counts[rating]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <ButtonLink to={appPaths.home} variant="secondary">
          Back to Today
        </ButtonLink>
      </div>
    </Panel>
  );
}
