import { useState, type FormEvent } from "react";
import type { Course, Flashcard, Unit } from "../../types/domain.ts";
import { Button } from "../ui/Button.tsx";
import { Dialog } from "../ui/Dialog.tsx";
import { SelectField } from "../ui/SelectField.tsx";

export function MoveCardDialog({
  open,
  card,
  courses,
  units,
  onClose,
  onMove,
}: {
  open: boolean;
  card: Flashcard | null;
  courses: Course[];
  units: Unit[];
  onClose: () => void;
  onMove: (unitId: string) => void;
}) {
  return (
    <Dialog
      open={open}
      title="Move card"
      description="Choose another unit. The card keeps the same study schedule."
      onClose={onClose}
    >
      {open && card ? (
        <MoveForm card={card} courses={courses} units={units} onClose={onClose} onMove={onMove} />
      ) : null}
    </Dialog>
  );
}

function MoveForm({
  card,
  courses,
  units,
  onClose,
  onMove,
}: {
  card: Flashcard;
  courses: Course[];
  units: Unit[];
  onClose: () => void;
  onMove: (unitId: string) => void;
}) {
  const destinations = units.filter((unit) => unit.id !== card.unitId);
  const [unitId, setUnitId] = useState(destinations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unitId) {
      setError("Choose a unit.");
      return;
    }
    setBusy(true);
    onMove(unitId);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <SelectField
        label="New unit"
        name="unitId"
        value={unitId}
        error={error}
        onChange={(event) => {
          setUnitId(event.target.value);
          if (error) setError(null);
        }}
      >
        <option value="">Select a unit</option>
        {destinations.map((unit) => {
          const course = courses.find((item) => item.id === unit.courseId);
          return (
            <option key={unit.id} value={unit.id}>
              {course ? `${course.name} / ${unit.name}` : unit.name}
            </option>
          );
        })}
      </SelectField>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || destinations.length === 0}>
          Move card
        </Button>
      </div>
    </form>
  );
}
