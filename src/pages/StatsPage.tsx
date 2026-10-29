import { PageHeader } from "../components/layout/PageHeader.tsx";
import { Panel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { studyProgress } from "../features/progress/studyProgress.ts";
import { countDueCards } from "../services/scheduler/due.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { formatStreak } from "../utils/format.ts";

export function StatsPage() {
  usePageTitle("Stats");
  const { cards, state } = useLibrary();
  const dueCount = countDueCards(cards);
  const progress = studyProgress(state);

  return (
    <>
      <PageHeader title="Stats" lede="Counts from your reviews. Nothing here is estimated." />
      <dl className="grid gap-4 sm:grid-cols-2">
        <Panel tone="sunshine" className="p-5">
          <dt className="text-sm font-bold text-muted">Reviews today</dt>
          <dd className="mt-2 font-pixel text-4xl tabular-nums">{progress.reviewsToday}</dd>
        </Panel>
        <Panel className="p-5">
          <dt className="text-sm font-bold text-muted">Accuracy</dt>
          <dd className="mt-2 text-xl font-bold">
            {progress.accuracy === null ? "No reviews yet" : `${String(progress.accuracy)}%`}
          </dd>
        </Panel>
        <Panel tone="lavender" className="p-5">
          <dt className="text-sm font-bold text-muted">Streak</dt>
          <dd className="mt-2 font-pixel text-3xl">{formatStreak(progress.currentStreak)}</dd>
        </Panel>
        <Panel tone="meadow" className="p-5">
          <dt className="text-sm font-bold text-muted">Due</dt>
          <dd className="mt-2 font-pixel text-4xl tabular-nums">{dueCount}</dd>
        </Panel>
      </dl>
    </>
  );
}
