import { useState, type FormEvent } from "react";
import {
  MAX_ALIAS_COUNT,
  MAX_DESCRIPTION_LENGTH,
  MAX_TERM_LENGTH,
  validateCardForm,
  type CardFieldErrors,
} from "../../features/library/validateCard.ts";
import type { CardContent, Flashcard, Unit } from "../../types/domain.ts";
import { formatLineList } from "../../utils/listText.ts";
import { Button } from "../ui/Button.tsx";
import { Dialog } from "../ui/Dialog.tsx";
import { SelectField } from "../ui/SelectField.tsx";
import { TextArea } from "../ui/TextArea.tsx";
import { TextField } from "../ui/TextField.tsx";

export function CardFormDialog({
  open,
  title,
  units,
  initialUnitId,
  card,
  lockUnit = false,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  units: Unit[];
  initialUnitId?: string;
  card?: Flashcard;
  lockUnit?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (unitId: string, content: CardContent) => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      description="Term and description are required. Aliases and fill-in-the-blank are optional."
      wide
      onClose={onClose}
    >
      {open ? (
        <CardForm
          units={units}
          initialUnitId={initialUnitId}
          card={card}
          lockUnit={lockUnit}
          submitLabel={submitLabel}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  );
}

function CardForm({
  units,
  initialUnitId,
  card,
  lockUnit,
  submitLabel,
  onClose,
  onSubmit,
}: {
  units: Unit[];
  initialUnitId?: string;
  card?: Flashcard;
  lockUnit: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (unitId: string, content: CardContent) => void;
}) {
  const [unitId, setUnitId] = useState(card?.unitId ?? initialUnitId ?? units[0]?.id ?? "");
  const [term, setTerm] = useState(card?.term ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [aliasesText, setAliasesText] = useState(formatLineList(card?.acceptedAnswers ?? []));
  const [fillBlankPrompt, setFillBlankPrompt] = useState(card?.fillBlank?.prompt ?? "");
  const [fillBlankAnswersText, setFillBlankAnswersText] = useState(
    formatLineList(card?.fillBlank?.acceptedAnswers ?? []),
  );
  const [errors, setErrors] = useState<CardFieldErrors>({});
  const [busy, setBusy] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCardForm({
      unitId,
      term,
      description,
      aliasesText,
      fillBlankPrompt,
      fillBlankAnswersText,
    });
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    onSubmit(result.value.unitId, result.value.content);
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
      <SelectField
        label="Unit"
        name="unitId"
        value={unitId}
        disabled={lockUnit || Boolean(card)}
        error={errors.unitId}
        onChange={(event) => {
          setUnitId(event.target.value);
          if (errors.unitId) setErrors((current) => ({ ...current, unitId: undefined }));
        }}
      >
        <option value="">Select a unit</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Term"
        name="term"
        value={term}
        maxLength={MAX_TERM_LENGTH}
        autoComplete="off"
        error={errors.term}
        onChange={(event) => {
          setTerm(event.target.value);
          if (errors.term) setErrors((current) => ({ ...current, term: undefined }));
        }}
      />
      <TextArea
        label="Description"
        name="description"
        value={description}
        rows={4}
        maxLength={MAX_DESCRIPTION_LENGTH}
        error={errors.description}
        onChange={(event) => {
          setDescription(event.target.value);
          if (errors.description) setErrors((current) => ({ ...current, description: undefined }));
        }}
      />
      <TextArea
        label="Accepted aliases"
        name="aliases"
        value={aliasesText}
        rows={3}
        hint={`Optional. One per line, up to ${String(MAX_ALIAS_COUNT)}.`}
        error={errors.acceptedAnswers}
        onChange={(event) => {
          setAliasesText(event.target.value);
          if (errors.acceptedAnswers) setErrors((current) => ({ ...current, acceptedAnswers: undefined }));
        }}
      />
      <TextField
        label="Fill-in-the-blank prompt"
        name="fillBlankPrompt"
        value={fillBlankPrompt}
        autoComplete="off"
        hint="Optional. If empty, Miso blanks the term in the description when it appears as its own word."
        error={errors.fillBlank}
        onChange={(event) => {
          setFillBlankPrompt(event.target.value);
          if (errors.fillBlank) setErrors((current) => ({ ...current, fillBlank: undefined }));
        }}
      />
      <TextArea
        label="Fill-in-the-blank answers"
        name="fillBlankAnswers"
        value={fillBlankAnswersText}
        rows={2}
        hint="Optional. One accepted answer per line."
        onChange={(event) => setFillBlankAnswersText(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
