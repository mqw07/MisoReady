import { appPaths } from "../routes.ts";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CardFormDialog } from "../components/cards/CardFormDialog.tsx";
import { CardList } from "../components/cards/CardList.tsx";
import { GenerateCardsDialog } from "../components/cards/GenerateCardsDialog.tsx";
import { MoveCardDialog } from "../components/cards/MoveCardDialog.tsx";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { Button, ButtonLink } from "../components/ui/Button.tsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { NamePromptDialog } from "../components/ui/NamePromptDialog.tsx";
import { unitDeleteCounts } from "../features/library/mutations.ts";
import { useLibrary } from "../features/library/useLibrary.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { countDueCards } from "../services/scheduler/due.ts";
import type { Flashcard } from "../types/domain.ts";
import { formatCardCount, formatDueCount } from "../utils/format.ts";

export function UnitPage() {
  const { courseId, unitId } = useParams();
  const navigate = useNavigate();
  const {
    state,
    courses,
    units,
    cards,
    createCard,
    createCards,
    updateCard,
    deleteCard,
    duplicateCard,
    moveCard,
    renameUnit,
    deleteUnit,
  } = useLibrary();
  const course = courses.find((item) => item.id === courseId);
  const unit = units.find((item) => item.id === unitId && item.courseId === courseId);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [moving, setMoving] = useState<Flashcard | null>(null);
  const [deletingCard, setDeletingCard] = useState<Flashcard | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  usePageTitle(unit?.name ?? "Unit");

  if (!course || !unit) {
    return (
      <>
        <PageHeader eyebrow="Unit" title="Unit not found" lede="That unit is not saved on this device." />
        <ButtonLink to={appPaths.home} variant="secondary">
          Back to Today
        </ButtonLink>
      </>
    );
  }

  const unitCards = cards.filter((card) => card.unitId === unit.id);
  const dueCount = countDueCards(unitCards);
  const counts = unitDeleteCounts(state, unit.id);
  const courseUnits = units.filter((item) => item.courseId === course.id);

  return (
    <>
      <PageHeader
        eyebrow={course.name}
        title={unit.name}
        lede={`${formatCardCount(unitCards.length)} · ${formatDueCount(dueCount)}. Cards in this unit share one study schedule.`}
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
      <p className="mb-6 text-sm text-muted">
        <Link to={appPaths.course(course.id)} className="font-bold underline decoration-line-strong underline-offset-4">
          Back to {course.name}
        </Link>
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <ButtonLink
          to={appPaths.study({ courseId: course.id, unitId: unit.id, scope: "due" })}
          variant={dueCount === 0 ? "secondary" : "primary"}
        >
          Study due
        </ButtonLink>
        <ButtonLink to={appPaths.learn({ courseId: course.id, unitId: unit.id })} variant="secondary">Learn</ButtonLink>
        <ButtonLink to={appPaths.study({ courseId: course.id, unitId: unit.id, scope: "all" })} variant="secondary">
          Study all
        </ButtonLink>
        <Button onClick={() => setCardDialogOpen(true)}>Add card</Button>
        <Button variant="secondary" onClick={() => setGenerateOpen(true)}>
          Generate from notes
        </Button>
      </div>
      {unitCards.length === 0 ? (
        <EmptyState
          art="books"
          title="No cards yet"
          body="Add a card yourself, or generate editable drafts from notes."
        />
      ) : (
        <CardList
          cards={unitCards}
          onEdit={setEditing}
          onDuplicate={(card) => duplicateCard(card.id)}
          onMove={setMoving}
          onDelete={setDeletingCard}
        />
      )}
      <CardFormDialog
        open={cardDialogOpen}
        title="New card"
        units={courseUnits}
        initialUnitId={unit.id}
        lockUnit
        submitLabel="Create card"
        onClose={() => setCardDialogOpen(false)}
        onSubmit={(_selectedUnitId, content) => {
          createCard(unit.id, content);
          setCardDialogOpen(false);
        }}
      />
      <GenerateCardsDialog
        open={generateOpen}
        units={courseUnits}
        initialUnitId={unit.id}
        lockUnit
        onClose={() => setGenerateOpen(false)}
        onCommit={(_selectedUnitId, contents) => {
          createCards(unit.id, contents);
          setGenerateOpen(false);
        }}
      />
      <CardFormDialog
        open={Boolean(editing)}
        title="Edit card"
        units={courseUnits}
        card={editing ?? undefined}
        submitLabel="Save card"
        onClose={() => setEditing(null)}
        onSubmit={(_selectedUnitId, content) => {
          if (editing) updateCard(editing.id, content);
          setEditing(null);
        }}
      />
      <MoveCardDialog
        open={Boolean(moving)}
        card={moving}
        courses={courses}
        units={units}
        onClose={() => setMoving(null)}
        onMove={(nextUnitId) => {
          if (moving) moveCard(moving.id, nextUnitId);
          setMoving(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingCard)}
        title="Delete card"
        description={
          deletingCard
            ? `Delete “${deletingCard.term}”? Its study history for this card will also be removed.`
            : "Delete this card?"
        }
        confirmLabel="Delete card"
        danger
        onClose={() => setDeletingCard(null)}
        onConfirm={() => {
          if (deletingCard) deleteCard(deletingCard.id);
          setDeletingCard(null);
        }}
      />
      <NamePromptDialog
        open={renameOpen}
        title="Rename unit"
        description="This name appears under the course in the sidebar."
        label="Unit name"
        submitLabel="Save name"
        initialValue={unit.name}
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => {
          renameUnit(unit.id, name);
          setRenameOpen(false);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete unit"
        description={`This will delete ${unit.name} and ${formatCardCount(counts.cards)}. This cannot be undone.`}
        confirmLabel="Delete unit"
        danger
        busy={deleteBusy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteBusy(true);
          deleteUnit(unit.id);
          navigate(appPaths.course(course.id));
        }}
      />
    </>
  );
}
