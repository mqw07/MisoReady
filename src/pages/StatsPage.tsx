import { appPaths } from "../routes.ts";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { Panel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { studyProgress } from "../features/progress/studyProgress.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { formatPoints, formatStreak } from "../utils/format.ts";

const TILES = [
  { key: "reviewsToday", label: "Reviews today", hint: "Legitimate scheduled reviews saved today." },
  { key: "accuracy", label: "Accuracy", hint: "Share of graded reviews marked correct." },
  { key: "streak", label: "Streak", hint: "Consecutive local days that met the study goal." },
  { key: "longest", label: "Longest streak", hint: "Best qualified streak saved on this device." },
  { key: "due", label: "Due", hint: "Cards waiting, from the shared FSRS schedule." },
  { key: "points", label: "Points", hint: "Earned from eligible reviews, never estimated." },
] as const;

export function StatsPage() {
  usePageTitle("Stats");
  const { state } = useLibrary();
  const progress = studyProgress(state);
  const values: Record<(typeof TILES)[number]["key"], string> = {
    reviewsToday: String(progress.reviewsToday),
    accuracy: progress.accuracy === null ? "No reviews yet" : `${String(progress.accuracy)}%`,
    streak: formatStreak(progress.currentStreak),
    longest: formatStreak(progress.longestStreak),
    due: String(progress.dueCount),
    points: formatPoints(progress.points),
  };

  return (
    <>
      <PageHeader
        title="Stats"
        lede="Counts from saved reviews and due times. Nothing here is estimated."
      />
      {progress.totalReviews === 0 ? (
        <div className="mb-6">
          <EmptyState
            art="studying"
            title="No study history yet"
            body="Study a due card to start these counts. Opening Miso does not add a review."
            action={
              <ButtonLink to={appPaths.study()} variant="secondary">
                Study due
              </ButtonLink>
            }
          />
        </div>
      ) : null}
      <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.map((tile, index) => (
          <Panel
            key={tile.key}
            tone={index % 3 === 0 ? "sunshine" : index % 3 === 1 ? "lavender" : "meadow"}
            className="px-6 py-5"
          >
            <dt className="text-sm font-bold text-muted">{tile.label}</dt>
            <dd className="mt-2 font-pixel text-3xl leading-none text-ink tabular-nums sm:text-4xl">
              {values[tile.key]}
            </dd>
            <p className="mt-3 text-sm leading-5 text-muted">{tile.hint}</p>
          </Panel>
        ))}
      </dl>
    </>
  );
}
