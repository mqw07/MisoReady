import type { CardContent } from "../../types/domain.ts";
import { parseLineList } from "../../utils/listText.ts";

export const MAX_TERM_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 8000;
export const MAX_ALIAS_COUNT = 20;
export const MAX_ALIAS_LENGTH = 200;

export type CardFieldErrors = Partial<
  Record<"unitId" | "term" | "description" | "acceptedAnswers" | "fillBlank", string>
>;

export function validateCardForm(input: {
  unitId: string;
  term: string;
  description: string;
  aliasesText: string;
  fillBlankPrompt: string;
  fillBlankAnswersText: string;
}): { errors: CardFieldErrors } | { value: { unitId: string; content: CardContent } } {
  const errors: CardFieldErrors = {};
  const unitId = input.unitId.trim();
  const term = input.term.trim();
  const description = input.description.trim();
  const acceptedAnswers = parseLineList(input.aliasesText);
  const fillPrompt = input.fillBlankPrompt.trim();
  const fillAnswers = parseLineList(input.fillBlankAnswersText);

  if (!unitId) errors.unitId = "Choose a unit.";
  if (!term) errors.term = "Enter a term.";
  else if (term.length > MAX_TERM_LENGTH) errors.term = `Use ${String(MAX_TERM_LENGTH)} characters or fewer.`;
  if (!description) errors.description = "Enter a description.";
  else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Use ${String(MAX_DESCRIPTION_LENGTH)} characters or fewer.`;
  }
  if (acceptedAnswers.length > MAX_ALIAS_COUNT) {
    errors.acceptedAnswers = `Use ${String(MAX_ALIAS_COUNT)} aliases or fewer.`;
  } else if (acceptedAnswers.some((alias) => alias.length > MAX_ALIAS_LENGTH)) {
    errors.acceptedAnswers = `Keep each alias to ${String(MAX_ALIAS_LENGTH)} characters or fewer.`;
  }
  if (fillPrompt && fillAnswers.length === 0) {
    errors.fillBlank = "Add at least one fill-in-the-blank answer.";
  } else if (!fillPrompt && fillAnswers.length > 0) {
    errors.fillBlank = "Add a fill-in-the-blank prompt.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: {
      unitId,
      content: {
        term,
        description,
        acceptedAnswers,
        fillBlank:
          fillPrompt && fillAnswers.length > 0
            ? { prompt: fillPrompt, acceptedAnswers: fillAnswers }
            : undefined,
      },
    },
  };
}
