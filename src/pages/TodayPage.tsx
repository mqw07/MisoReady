import { Link } from "react-router";
import { ArrowRightIcon, BookIcon, GraduationIcon, NoteIcon, PlayIcon, TodayIcon } from "../components/icons.tsx";
import { MisoPortrait } from "../components/miso/MisoPortrait.tsx";
import { Sprite } from "../components/miso/Sprite.tsx";
import { WindowsillMiso } from "../components/miso/WindowsillMiso.tsx";
import { GrassStrip, PawScatter, PixelCloud, PixelSun, PlusSparkle } from "../components/pixel/decor.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { TitledPanel } from "../components/ui/Panel.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { studyProgress } from "../features/progress/studyProgress.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { countDueCards } from "../services/scheduler/due.ts";
import { formatCardCount, formatDueCount, formatPoints, formatStreak, formatUnitCount } from "../utils/format.ts";
import { greetingNow } from "../utils/greeting.ts";

export function TodayPage() {
  usePageTitle("Today");
  const { courses, units, cards, state } = useLibrary();
  const recent = courses[courses.length - 1];
  const dueCount = countDueCards(cards);
  const progress = studyProgress(state);
  const dueLabel = dueCount === 0 ? "No cards are waiting." : `${dueCount} ${dueCount === 1 ? "card is" : "cards are"} waiting.`;

  return (
    <>
      <header className="relative mb-8 flex min-h-[12rem] items-end justify-between gap-6">
        <div className="max-w-xl pb-10">
          <div className="flex items-center gap-3">
            <PixelSun className="h-11 w-11 shrink-0" />
            <h1 className="font-pixel text-[2.2rem] leading-none text-ink sm:text-[2.75rem]">{greetingNow()},</h1>
          </div>
          <p className="mt-3 text-base leading-6 font-semibold text-muted">
            See what is due, then study when you are ready.
          </p>
        </div>
        <WindowsillMiso />
      </header>

      <div className="grid items-stretch gap-5 lg:grid-cols-5">
        <TitledPanel
          tone="sunshine"
          icon={<TodayIcon scale={2} />}
          title="Due today"
          className="flex flex-col lg:col-span-3"
        >
          <PawScatter />
          <div className="relative px-6 pt-2 pb-8">
            <p className="font-pixel text-6xl leading-none text-ink tabular-nums">{dueCount}</p>
            <p className="mt-2 text-sm leading-6 font-semibold text-muted">{dueLabel}</p>
            <div className="mt-2.5">
              <ButtonLink to="/study">
                <PlayIcon />
                Study due
              </ButtonLink>
            </div>
          </div>
        </TitledPanel>

        <TitledPanel
          tone="sky"
          icon={<Sprite name="paw" className="h-7 w-auto [filter:hue-rotate(185deg)_saturate(1.5)]" />}
          title="Miso"
          className="flex flex-col lg:col-span-2"
          bodyClassName="relative min-h-[182px] flex-1"
        >
          <PixelCloud kind="small" tone="blue" className="decor absolute -top-[3.7rem] right-4 w-14" />
          <GrassStrip variant="low" />
          <PlusSparkle className="absolute top-1 right-3 h-4 w-4" />
          <PlusSparkle className="absolute top-10 right-[10.6rem] h-3.5 w-3.5" />
          <PlusSparkle className="absolute top-[7.2rem] right-1 h-3 w-3" />
          <div className="relative z-10 flex flex-col items-start gap-3.5 px-6 pt-1">
            <span className="rounded-full bg-[#cfe4f6] px-4 py-1.5 text-sm font-extrabold text-[#17233b]">
              {progress.reviewsToday}/{progress.dailyGoal} today
            </span>
            <div className="flex items-start gap-2.5">
              <Sprite name="streak" className="mt-0.5 h-7 w-auto" />
              <p className="text-sm leading-6 font-bold text-muted">
                {formatPoints(progress.points)} ·
                <br />
                {formatStreak(progress.currentStreak)}
              </p>
            </div>
          </div>
          <MisoPortrait
            className="absolute right-5 bottom-[14px] w-[7.6rem] xl:w-[9.2rem]"
            equipped={state.miso.equipped}
            idle
          />
        </TitledPanel>

        <TitledPanel
          tone="lavender"
          icon={<BookIcon scale={2} />}
          title="Continue studying"
          className="lg:col-span-3"
        >
          <div className="decor absolute top-5 right-8 grid grid-cols-3 gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((dot) => (
              <span key={dot} className={`h-[3px] w-[3px] bg-[#d6cbe9] ${dot === 1 || dot === 5 ? "opacity-0" : ""}`} />
            ))}
          </div>
          {recent ? (
            <Link
              to={`/courses/${recent.id}`}
              className="group flex items-center gap-4 px-5 pt-4 pb-6 focus-visible:outline-offset-[-4px]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lavender text-[#5a4a8f]">
                <NoteIcon />
              </span>
              <span className="min-w-0 flex-1 truncate text-lg font-extrabold text-ink">{recent.name}</span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                <ArrowRightIcon />
              </span>
            </Link>
          ) : (
            <p className="px-5 pt-4 pb-6 text-sm leading-6 font-semibold text-muted">
              Create a course to have a place to start.
            </p>
          )}
        </TitledPanel>

        <TitledPanel
          tone="meadow"
          icon={<GraduationIcon scale={2} />}
          title="Your courses"
          className="lg:col-span-5"
        >
          <GrassStrip variant="low" placement="free" scale={3} className="absolute top-[26px] right-6 w-36" />
          <div className="px-5 pt-4 pb-6">
            {courses.length === 0 ? (
              <EmptyState
                art="books"
                title="No courses yet"
                body="Create one from the sidebar to organize what you are studying."
              />
            ) : (
              <ul className="grid gap-3">
                {courses.map((course) => {
                  const unitCount = units.filter((unit) => unit.courseId === course.id).length;
                  const courseCards = cards.filter((card) => card.courseId === course.id);
                  const courseDue = countDueCards(courseCards);
                  return (
                    <li key={course.id}>
                      <Link
                        to={`/courses/${course.id}`}
                        className="group pixel-box pixel-box-sm pixel-box-link pb-leaf relative flex items-center gap-4 px-4 py-4 transition-transform duration-150 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-soft text-accent-ink">
                          <BookIcon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg font-extrabold break-words text-ink">{course.name}</span>
                          <span className="mt-0.5 block text-sm font-semibold text-muted">
                            {formatUnitCount(unitCount)} · {formatCardCount(courseCards.length)} ·{" "}
                            {formatDueCount(courseDue)}
                          </span>
                        </span>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                          <ArrowRightIcon />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TitledPanel>
      </div>
    </>
  );
}
