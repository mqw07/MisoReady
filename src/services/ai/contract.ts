import { z } from "zod";

export const MAX_SOURCE_CHARS = 12_000;
export const MIN_CARD_COUNT = 1;
export const MAX_CARD_COUNT = 20;
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_TERM_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 8000;
export const MAX_ALIAS_COUNT = 20;
export const MAX_ALIAS_LENGTH = 200;
export const MAX_FILL_PROMPT_LENGTH = 800;
export const DEFAULT_CARD_COUNT = 10;
export const CARD_COUNT_OPTIONS = [5, 8, 10, 12, 15, 20] as const;

export const generateRequestSchema = z.object({
  content: z.string().trim().min(1).max(MAX_SOURCE_CHARS),
  courseId: z.string().trim().min(1).max(80),
  unitId: z.string().trim().min(1).max(80),
  numberOfCards: z.number().int().min(MIN_CARD_COUNT).max(MAX_CARD_COUNT),
  preferFillBlank: z.boolean().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface GeneratedCard {
  term: string;
  description: string;
  acceptedAnswers: string[];
  fillBlank?: { prompt: string; acceptedAnswers: string[] };
}

export const generateErrorSchema = z.object({
  error: z.string().trim().min(1),
});

export const generateResponseSchema = z.object({
  cards: z.array(
    z.object({
      term: z.string().min(1).max(MAX_TERM_LENGTH),
      description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
      acceptedAnswers: z.array(z.string().min(1).max(MAX_ALIAS_LENGTH)).max(MAX_ALIAS_COUNT),
      fillBlank: z
        .object({
          prompt: z.string().min(1).max(MAX_FILL_PROMPT_LENGTH),
          acceptedAnswers: z.array(z.string().min(1).max(MAX_ALIAS_LENGTH)).min(1).max(MAX_ALIAS_COUNT),
        })
        .optional(),
    }),
  ),
});

export function requestErrorMessage(error: { issues: { path: PropertyKey[] }[] }): string {
  const field = error.issues[0]?.path[0];
  if (field === "content") return `Paste notes, up to ${String(MAX_SOURCE_CHARS)} characters.`;
  if (field === "numberOfCards") {
    return `Ask for between ${String(MIN_CARD_COUNT)} and ${String(MAX_CARD_COUNT)} cards.`;
  }
  if (field === "courseId" || field === "unitId") return "Choose a course and unit.";
  return "Check the notes, unit, and card count.";
}

export function parseGenerateRequest(payload: unknown): { value: GenerateRequest } | { error: string } {
  const parsed = generateRequestSchema.safeParse(payload);
  if (!parsed.success) return { error: requestErrorMessage(parsed.error) };
  return { value: parsed.data };
}

function uniqueTrimmed(values: string[], maxCount: number, maxLength: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const next = value.trim();
    if (!next || next.length > maxLength || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    if (result.length >= maxCount) break;
  }
  return result;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function pickString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = asTrimmedString(record[key]);
    if (value) return value;
  }
  return "";
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueTrimmed(
      value.map((item) => asTrimmedString(item)),
      MAX_ALIAS_COUNT,
      MAX_ALIAS_LENGTH,
    );
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parts = trimmed.includes("\n")
    ? trimmed.split(/\r?\n/)
    : trimmed.includes(",")
      ? trimmed.split(",")
      : [trimmed];
  return uniqueTrimmed(parts, MAX_ALIAS_COUNT, MAX_ALIAS_LENGTH);
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      const record = asRecord(part);
      return record ? asTrimmedString(record.text) : "";
    })
    .join("");
}

export function readModelText(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) return "";
  const choices = record.choices;
  const choice = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const message = choice ? asRecord(choice.message) : null;
  const content = message?.content ?? choice?.text ?? record.output_text;
  return contentToString(content).trim();
}

function unwrapCardList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return null;
  for (const key of ["cards", "flashcards", "items", "data"] as const) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return null;
}

function readFillBlank(
  raw: unknown,
  term: string,
  aliases: string[],
): GeneratedCard["fillBlank"] {
  const fallbackAnswers = uniqueTrimmed([term, ...aliases], MAX_ALIAS_COUNT, MAX_ALIAS_LENGTH);
  if (typeof raw === "string") {
    const prompt = raw.trim();
    if (!prompt || prompt.length > MAX_FILL_PROMPT_LENGTH || fallbackAnswers.length === 0) return undefined;
    return { prompt, acceptedAnswers: fallbackAnswers };
  }
  const record = asRecord(raw);
  if (!record) return undefined;
  const prompt = pickString(record, ["prompt", "text", "sentence", "blank"]);
  if (!prompt || prompt.length > MAX_FILL_PROMPT_LENGTH) return undefined;
  const listed = asStringList(
    record.acceptedAnswers ?? record.accepted_answers ?? record.answers ?? record.accepted,
  );
  const acceptedAnswers = listed.length > 0 ? listed : fallbackAnswers;
  return acceptedAnswers.length > 0 ? { prompt, acceptedAnswers } : undefined;
}

export function sanitizeGeneratedCard(payload: unknown): GeneratedCard | null {
  const record = asRecord(payload);
  if (!record) return null;
  const listedAnswers = asStringList(
    record.acceptedAnswers ?? record.accepted_answers ?? record.aliases ?? record.answers,
  );
  const term = pickString(record, ["term", "answer", "back", "name", "word", "title"]) || listedAnswers[0] || "";
  const description = pickString(record, ["description", "question", "front", "definition", "text", "prompt"]);
  if (!term || !description || term.length > MAX_TERM_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
    return null;
  }
  const acceptedAnswers = listedAnswers.filter((alias) => alias !== term);
  const fillBlank = readFillBlank(
    record.fillBlank ?? record.fill_blank ?? record.fillInTheBlank ?? record.fill_in_the_blank,
    term,
    acceptedAnswers,
  );
  return { term, description, acceptedAnswers, fillBlank };
}

export function parseGenerateResponse(payload: unknown): { cards: GeneratedCard[] } | { error: string } {
  const list = unwrapCardList(payload);
  if (!list) return { error: "The model returned unusable drafts." };
  const cards = list
    .map(sanitizeGeneratedCard)
    .filter((card): card is GeneratedCard => card !== null);
  if (cards.length === 0) return { error: "The model returned unusable drafts." };
  const checked = generateResponseSchema.safeParse({ cards });
  if (!checked.success) return { error: "The model returned unusable drafts." };
  return { cards: checked.data.cards };
}

export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const objectStart = candidate.indexOf("{");
    const arrayStart = candidate.indexOf("[");
    const start =
      objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart) ? objectStart : arrayStart;
    if (start < 0) throw new SyntaxError("No JSON value.");
    const closer = candidate[start] === "[" ? "]" : "}";
    const end = candidate.lastIndexOf(closer);
    if (end <= start) throw new SyntaxError("No JSON value.");
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

function blankTermInDescription(term: string, description: string): string | null {
  const needle = term.trim();
  if (needle.length < 2) return null;
  const index = description.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) return null;
  const prompt = `${description.slice(0, index)}_____${description.slice(index + needle.length)}`;
  return prompt.includes("_____") ? prompt : null;
}

export function ensureFillBlank(card: GeneratedCard): GeneratedCard {
  if (card.fillBlank?.prompt.includes("_____") && card.fillBlank.acceptedAnswers.length > 0) {
    return card;
  }
  const derived = blankTermInDescription(card.term, card.description);
  const prompt = (derived ?? `_____ — ${card.description}`).slice(0, MAX_FILL_PROMPT_LENGTH);
  const acceptedAnswers = uniqueTrimmed([card.term, ...card.acceptedAnswers], MAX_ALIAS_COUNT, MAX_ALIAS_LENGTH);
  return { ...card, fillBlank: { prompt, acceptedAnswers } };
}

export function applyFillBlankPreference(cards: GeneratedCard[], preferFillBlank: boolean): GeneratedCard[] {
  if (!preferFillBlank) return cards;
  return cards.map(ensureFillBlank);
}
