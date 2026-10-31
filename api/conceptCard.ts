import { sanitizeGeneratedCard, MAX_FILL_PROMPT_LENGTH } from "../src/services/ai/contract.ts";
import { conceptCardSchema, validBlank, type Concept } from "../src/services/ai/generationContract.ts";
import { safeTermIndex } from "../src/features/study/fillBlank.ts";

export class CardValidationError extends Error {
  readonly reason: string;
  constructor(reason: string) { super(reason); this.reason = reason; }
}

const identity = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");

export function resolveConceptCard(output: unknown, concept: Concept, preferFillBlank: boolean) {
  if (!output || typeof output !== "object" || Array.isArray(output)) throw new CardValidationError("INVALID_CARD_SHAPE");
  const envelope = output as Record<string, unknown>;
  // Accept the old envelope while new responses omit application-owned identity.
  const candidates = envelope.cards ?? envelope.flashcards;
  if (candidates !== undefined && (!Array.isArray(candidates) || candidates.length !== 1)) throw new CardValidationError("EXPECTED_ONE_CARD");
  const raw: unknown = Array.isArray(candidates) ? candidates[0] : envelope;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CardValidationError("INVALID_CARD_SHAPE");
  const fields = raw as Record<string, unknown>;
  if (fields.term !== undefined && (typeof fields.term !== "string" ||
    ![concept.term, ...concept.aliases].some(term => identity(term) === identity(fields.term as string)))) {
    throw new CardValidationError("WRONG_CONCEPT");
  }
  const card = sanitizeGeneratedCard({ ...fields, term: concept.term });
  if (!card) throw new CardValidationError("MISSING_OR_OVERSIZED_DEFINITION");
  card.acceptedAnswers = [...new Set([...concept.aliases, ...card.acceptedAnswers])].filter(answer => answer !== concept.term).slice(0, 20);
  // Answers and card identity belong to the application, rather than to an LLM
  // echo of the term (which may change capitalization or use an abbreviation).
  const answers = [concept.term, ...concept.aliases].slice(0, 20);
  if (preferFillBlank) {
    // Never attach the concept answer to a model-selected blank: a model may
    // blank a formula or number instead. Blank the actual term locally.
    const sentence = typeof fields.termSentence === "string" ? fields.termSentence.trim() : "";
    const source = sentence && sentence.length <= MAX_FILL_PROMPT_LENGTH && safeTermIndex(sentence, concept.term) >= 0
      ? sentence : card.description;
    const index = safeTermIndex(source, concept.term);
    const prompt = index >= 0
      ? `${source.slice(0, index)}_____${source.slice(index + concept.term.length)}`
      : `_____ — ${card.description}`;
    if (prompt.length > MAX_FILL_PROMPT_LENGTH || !validBlank(prompt)) throw new CardValidationError("BLANK_TOO_LONG_OR_AMBIGUOUS");
    card.fillBlank = { prompt, acceptedAnswers: answers };
  }
  return conceptCardSchema.parse({ cards: [card] });
}
