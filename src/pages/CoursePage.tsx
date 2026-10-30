import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CardFormDialog } from "../components/cards/CardFormDialog.tsx";
import { GenerateCardsDialog } from "../components/cards/GenerateCardsDialog.tsx";
import { ArrowRightIcon, BookIcon } from "../components/icons.tsx";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { Button, ButtonLink } from "../components/ui/Button.tsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { NamePromptDialog } from "../components/ui/NamePromptDialog.tsx";
import { courseDeleteCounts } from "../features/library/mutations.ts";
import { useLibrary } from "../features/library/useLibrary.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { countDueCards } from "../services/scheduler/due.ts";
import { formatCardCount, formatDueCount } from "../utils/format.ts";

export function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { state, courses, units, cards, createUnit, createCard, createCards, renameCourse, deleteCourse } =
    useLibrary();
  const course = courses.find((item) => item.id === courseId);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  usePageTitle(course?.name ?? "Course");

  if (!course || !courseId) {
    return (
      <>
        <PageHeader eyebrow="Course" title="Course not found" lede="That course is not saved on this device." />
        <ButtonLink to="/" variant="secondary">
          Back to Today
        </ButtonLink>
      </>
    );
  }

  const courseUnits = units.filter((unit) => unit.courseId === course.id);
  const courseCards = cards.filter((card) => card.courseId === course.id);
  const dueCount = countDueCards(courseCards);
  const counts = courseDeleteCounts(state, course.id);

  return (
    <>
      <PageHeader
        eyebrow="Course"
        title={course.name}
        lede={`${formatCardCount(courseCards.length)} · ${formatDueCount(dueCount)}. Units keep related cards together.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(true)}>
              Rename
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <ButtonLink to={`/learn?courseId=${course.id}`} variant="secondary">Learn</ButtonLink>
        <ButtonLink to={`/study?courseId=${course.id}&scope=due`} variant={dueCount === 0 ? "secondary" : "primary"}>
          Study due
        </ButtonLink>
        <ButtonLink to={`/study?courseId=${course.id}&scope=all`} variant="secondary">
          Study all
        </ButtonLink>
        <Button
          variant="secondary"
          onClick={() => setCardDialogOpen(true)}
          disabled={courseUnits.length === 0}
        >
          Add cards
        </Button>
        <Button variant="secondary" onClick={() => setGenerateOpen(true)} disabled={courseUnits.length === 0}>
          Generate from notes
        </Button>
        <Button onClick={() => setUnitDialogOpen(true)}>Add unit</Button>
      </div>
      {courseUnits.length === 0 ? (
        <EmptyState
          art="books"
          title="No units yet"
          body="Add a unit for a topic you want to study, such as a chapter or a lecture, before you add cards."
        />
      ) : (
        <ul className="grid gap-3">
          {courseUnits.map((unit) => {
            const unitCards = courseCards.filter((card) => card.unitId === unit.id);
            const unitDue = countDueCards(unitCards);
            return (
              <li key={unit.id}>
                <Link
                  to={`/courses/${course.id}/units/${unit.id}`}
                  className="group pixel-box pixel-box-sm pixel-box-link pb-surface relative flex items-center gap-4 px-4 py-4 transition-transform duration-150 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-lavender text-ink-soft">
                    <BookIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold break-words text-ink">{unit.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {formatCardCount(unitCards.length)} · {formatDueCount(unitDue)}
                    </span>
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft text-ink transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                    <ArrowRightIcon />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <NamePromptDialog
        open={unitDialogOpen}
        title="New unit"
        description="Name a unit inside this course. It is saved on this device."
        label="Unit name"
        placeholder="For example, Processes"
        submitLabel="Create unit"
        onClose={() => setUnitDialogOpen(false)}
        onSubmit={(name) => {
          createUnit(course.id, name);
          setUnitDialogOpen(false);
        }}
      />
      <NamePromptDialog
        open={renameOpen}
        title="Rename course"
        description="This name appears in the sidebar and on Today."
        label="Course name"
        submitLabel="Save name"
        initialValue={course.name}
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => {
          renameCourse(course.id, name);
          setRenameOpen(false);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete course"
        description={`This will delete ${course.name}, ${formatCardCount(counts.cards)}, and ${counts.units === 1 ? "1 unit" : `${String(counts.units)} units`}. This cannot be undone.`}
        confirmLabel="Delete course"
        danger
        busy={deleteBusy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteBusy(true);
          deleteCourse(course.id);
          navigate("/");
        }}
      />
      <CardFormDialog
        open={cardDialogOpen}
        title="New card"
        units={courseUnits}
        initialUnitId={courseUnits[0]?.id}
        submitLabel="Create card"
        onClose={() => setCardDialogOpen(false)}
        onSubmit={(unitId, content) => {
          createCard(unitId, content);
          setCardDialogOpen(false);
        }}
      />
      <GenerateCardsDialog
        open={generateOpen}
        units={courseUnits}
        initialUnitId={courseUnits[0]?.id}
        onClose={() => setGenerateOpen(false)}
        onCommit={(unitId, contents) => {
          createCards(unitId, contents);
          setGenerateOpen(false);
        }}
      />
    </>
  );
}
