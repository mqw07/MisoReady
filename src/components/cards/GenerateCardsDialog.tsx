import type { GenerationCheckpoint } from "../../services/ai/generationPipeline.ts";
import { useContext, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { LibraryContext } from "../../features/library/libraryContext.ts";
import {
  MAX_ALIAS_COUNT,
  MAX_DESCRIPTION_LENGTH,
  MAX_TERM_LENGTH,
  validateCardForm,
  type CardFieldErrors,
} from "../../features/library/validateCard.ts";
import { requestGeneratedCards } from "../../services/ai/client.ts";
import {
  type GeneratedCard,
} from "../../services/ai/contract.ts";
import { extractPdfNotes } from "../../services/ai/pdfNotes.ts";
import type { CardContent, Unit } from "../../types/domain.ts";
import { formatLineList } from "../../utils/listText.ts";
import { Button } from "../ui/Button.tsx";
import { Dialog } from "../ui/Dialog.tsx";
import { SelectField } from "../ui/SelectField.tsx";
import { TextArea } from "../ui/TextArea.tsx";
import { TextField } from "../ui/TextField.tsx";

interface DraftForm {
  id: string;
  term: string;
  description: string;
  aliasesText: string;
  fillBlankPrompt: string;
  fillBlankAnswersText: string;
}

function draftsFromCards(cards: GeneratedCard[]): DraftForm[] {
  return cards.map((card) => ({
    id: crypto.randomUUID(),
    term: card.term,
    description: card.description,
    aliasesText: formatLineList(card.acceptedAnswers),
    fillBlankPrompt: card.fillBlank?.prompt ?? "",
    fillBlankAnswersText: formatLineList(card.fillBlank?.acceptedAnswers ?? []),
  }));
}

export function GenerateCardsDialog({
  open,
  units,
  initialUnitId,
  lockUnit = false,
  onClose,
  onCommit,
}: {
  open: boolean;
  units: Unit[];
  initialUnitId?: string;
  lockUnit?: boolean;
  onClose: () => void;
  onCommit: (unitId: string, contents: CardContent[]) => void;
}) {
  return (
    <Dialog
      open={open}
      title="Generate cards"
      description="Paste notes or upload a PDF. Nothing is saved until you review and confirm."
      wide
      onClose={onClose}
    >
      {open ? (
        <GenerateCardsForm
          units={units}
          initialUnitId={initialUnitId}
          lockUnit={lockUnit}
          onClose={onClose}
          onCommit={onCommit}
        />
      ) : null}
    </Dialog>
  );
}

function GenerateCardsForm({
  units,
  initialUnitId,
  lockUnit,
  onClose,
  onCommit,
}: {
  units: Unit[];
  initialUnitId?: string;
  lockUnit: boolean;
  onClose: () => void;
  onCommit: (unitId: string, contents: CardContent[]) => void;
}) {
  const abortRef = useRef<AbortController | null>(null);
  const pdfInputId = useId();
  const pdfHintId = useId();
  const fillBlankId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"compose" | "review">("compose");
  const [unitId, setUnitId] = useState(initialUnitId ?? units[0]?.id ?? "");
  const checkpointRef = useRef<GenerationCheckpoint | undefined>(undefined);
  const [progress, setProgress] = useState("");
  const [page, setPage] = useState(0);
  const [notes, setNotes] = useState("");
  const [preferFillBlank, setPreferFillBlank] = useState(true);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [fromPdf, setFromPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftForm[]>([]);
  const [draftErrors, setDraftErrors] = useState<Record<string, CardFieldErrors>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const riskId = useId();
  const setNavigationRisk = useContext(LibraryContext)?.setNavigationRisk;
  const hasDraftWork = busy || extracting || notes.trim().length > 0 || drafts.length > 0;

  useEffect(() => {
    setNavigationRisk?.(riskId, hasDraftWork ? "Unfinished card generation" : null);
    return () => setNavigationRisk?.(riskId, null);
  }, [setNavigationRisk, riskId, hasDraftWork]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function close() {
    abortRef.current?.abort();
    onClose();
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unit = units.find((item) => item.id === unitId);
    if (!unit) {
      setError("Choose a unit.");
      return;
    }
    if (!notes.trim()) {
      setError("Paste notes or upload a PDF.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    if (checkpointRef.current?.content !== notes || checkpointRef.current?.preferFillBlank !== preferFillBlank) {
      checkpointRef.current = { content: notes, preferFillBlank, extracted: [], cards: [] };
    }
    try {
      const result = await requestGeneratedCards(
        {
          content: notes,
          courseId: unit.courseId,
          unitId: unit.id,
          ...(preferFillBlank ? { preferFillBlank: true } : {}),
        },
        { signal: controller.signal, checkpoint: checkpointRef.current, onProgress: setProgress },
      );
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDrafts(draftsFromCards(result.cards));
      setPage(0);
      setDraftErrors({});
      setStep("review");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError("Could not reach the generation service. Your notes are still here.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function updateDraft(id: string, patch: Partial<DraftForm>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    if (draftErrors[id]) {
      setDraftErrors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (drafts.length === 0) {
      setError("No drafts left. Generate again or close.");
      return;
    }
    const contents: CardContent[] = [];
    const nextErrors: Record<string, CardFieldErrors> = {};
    for (const draft of drafts) {
      const result = validateCardForm({
        unitId,
        term: draft.term,
        description: draft.description,
        aliasesText: draft.aliasesText,
        fillBlankPrompt: draft.fillBlankPrompt,
        fillBlankAnswersText: draft.fillBlankAnswersText,
      });
      if ("errors" in result) {
        nextErrors[draft.id] = result.errors;
      } else {
        contents.push(result.value.content);
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setDraftErrors(nextErrors);
      const firstInvalid = drafts.findIndex((draft) => nextErrors[draft.id]);
      setPage(Math.floor(firstInvalid / 25));
      setError("Fix the highlighted drafts before saving.");
      return;
    }
    setBusy(true);
    onCommit(unitId, contents);
  }

  function clearPdf() {
    setPdfName(null);
    setFromPdf(false);
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    setNotice(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let result;
    try {
      result = await extractPdfNotes(file, controller.signal);
    } catch {
      if (controller.signal.aborted) return;
      setExtracting(false);
      setError("Could not read that PDF.");
      return;
    }
    if (controller.signal.aborted) return;
    setExtracting(false);
    if ("error" in result) {
      setError(result.error);
      clearPdf();
      return;
    }
    setNotes(result.text);
    setPdfName(file.name);
    setFromPdf(true);
    if (result.unreadablePages?.length) {
      setNotice(`Pages without readable text: ${result.unreadablePages.join(", ")}. These pages need OCR and will not be analyzed.`);
    }
  }

  const currentPage = Math.min(page, Math.max(0, Math.ceil(drafts.length / 25) - 1));
  if (step === "review") {
    return (
      <form noValidate className="grid gap-4" onSubmit={handleSave}>
        <p className="text-sm text-muted">
          Edit or remove drafts. Saving adds them as new cards. Existing cards are not changed.
        </p>
        {error ? (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        ) : null}
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">No drafts left. Generate again or close.</p>
        ) : (
          <ol className="grid max-h-[min(32rem,55vh)] gap-4 overflow-y-auto pr-1">
            {drafts.slice(currentPage * 25, currentPage * 25 + 25).map((draft, index) => (
              <li key={draft.id}>
                <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
                  <legend className="px-1 text-sm font-bold text-ink">
                    Draft {String(currentPage * 25 + index + 1)} of {String(drafts.length)}
                  </legend>
                  <TextField
                    label="Term"
                    name={`term-${draft.id}`}
                    value={draft.term}
                    maxLength={MAX_TERM_LENGTH}
                    autoComplete="off"
                    error={draftErrors[draft.id]?.term}
                    onChange={(event) => updateDraft(draft.id, { term: event.target.value })}
                  />
                  <TextArea
                    label="Description"
                    name={`description-${draft.id}`}
                    value={draft.description}
                    rows={3}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    error={draftErrors[draft.id]?.description}
                    onChange={(event) => updateDraft(draft.id, { description: event.target.value })}
                  />
                  <TextArea
                    label="Accepted aliases"
                    name={`aliases-${draft.id}`}
                    value={draft.aliasesText}
                    rows={2}
                    hint={`Optional. One per line, up to ${String(MAX_ALIAS_COUNT)}.`}
                    error={draftErrors[draft.id]?.acceptedAnswers}
                    onChange={(event) => updateDraft(draft.id, { aliasesText: event.target.value })}
                  />
                  <TextField
                    label="Fill-in-the-blank prompt"
                    name={`fill-${draft.id}`}
                    value={draft.fillBlankPrompt}
                    autoComplete="off"
                    error={draftErrors[draft.id]?.fillBlank}
                    onChange={(event) => updateDraft(draft.id, { fillBlankPrompt: event.target.value })}
                  />
                  <TextArea
                    label="Fill-in-the-blank answers"
                    name={`fill-answers-${draft.id}`}
                    value={draft.fillBlankAnswersText}
                    rows={2}
                    onChange={(event) => updateDraft(draft.id, { fillBlankAnswersText: event.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${draft.term || "untitled draft"}`}
                      onClick={() => {
                        setDrafts((current) => current.filter((item) => item.id !== draft.id));
                        setDraftErrors((current) => {
                          const next = { ...current };
                          delete next[draft.id];
                          return next;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
        )}
        {drafts.length > 25 ? <nav aria-label="Draft pages" className="flex items-center justify-between gap-2">
          <Button variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button>
          <span>Page {currentPage + 1} of {Math.ceil(drafts.length / 25)}</span>
          <Button variant="secondary" disabled={(currentPage + 1) * 25 >= drafts.length} onClick={() => setPage(currentPage + 1)}>Next</Button>
        </nav> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setStep("compose");
            }}
            disabled={busy}
          >
            Back to notes
          </Button>
          <Button type="submit" disabled={busy || drafts.length === 0}>
            Save cards
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={(event) => void handleGenerate(event)}>
      <SelectField
        label="Unit"
        name="unitId"
        value={unitId}
        disabled={lockUnit || busy || extracting}
        onChange={(event) => {
          setUnitId(event.target.value);
          if (error) setError(null);
        }}
      >
        <option value="">Select a unit</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </SelectField>
      <p className="text-sm text-muted">AI identifies the key concepts, then writes a card for each. There is no fixed card count.</p>
      <div>
        <label htmlFor={pdfInputId} className="mb-2 block text-sm font-bold text-ink">
          PDF notes
        </label>
        <input
          ref={fileRef}
          id={pdfInputId}
          name="pdfNotes"
          type="file"
          accept="application/pdf,.pdf"
          aria-describedby={pdfHintId}
          disabled={extracting || busy}
          onChange={(event) => void handlePdfChange(event)}
          className="block w-full text-sm text-ink file:mr-3 file:rounded-2xl file:border-0 file:bg-green-soft file:px-4 file:py-2 file:font-bold file:text-ink"
        />
        <p id={pdfHintId} className="mt-2 text-sm text-muted">
          {fromPdf
            ? "You can still edit the extracted notes before generating."
            : "Optional. Text PDFs work best. We'll extract the notes on this device."}
        </p>
        {pdfName ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink">Using {pdfName}</p>
            <Button variant="ghost" size="sm" onClick={clearPdf} disabled={extracting || busy}>
              Remove PDF
            </Button>
          </div>
        ) : null}
      </div>
      <TextArea
        label="Study notes"
        name="notes"
        value={notes}
        rows={8}
        disabled={busy || extracting}
        hint="Miso turns these notes into editable drafts. Existing cards are never overwritten."
        onChange={(event) => {
          setNotes(event.target.value);
          if (error) setError(null);
        }}
      />
      <div>
        <label htmlFor={fillBlankId} className="flex items-start gap-3 text-sm font-bold text-ink">
          <input
            id={fillBlankId}
            name="preferFillBlank"
            type="checkbox"
            disabled={busy || extracting}
            checked={preferFillBlank}
            aria-label="Generate fill-in-the-blank prompts"
            onChange={(event) => setPreferFillBlank(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            Generate fill-in-the-blank prompts
            <span className="mt-1 block font-normal text-muted">Applies to pasted notes and PDFs.</span>
          </span>
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm font-bold text-ink">
          {notice}
        </p>
      ) : null}
      {extracting ? (
        <p role="status" className="text-sm font-bold text-ink">
          Reading PDF…
        </p>
      ) : null}
      {busy ? (
        <p role="status" className="text-sm font-bold text-ink">
          {progress || "Generating drafts…"}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || extracting} aria-busy={busy || extracting}>
          Generate drafts
        </Button>
      </div>
    </form>
  );
}
