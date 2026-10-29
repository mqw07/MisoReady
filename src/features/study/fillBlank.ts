import type { FillBlank, Flashcard } from "../../types/domain.ts";

const LETTER_OR_NUMBER = /[\p{L}\p{N}_]/u;

export function isTokenBoundary(character: string | undefined): boolean {
  if (!character) return true;
  return !LETTER_OR_NUMBER.test(character);
}

function uniqueAnswers(answers: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const answer of answers) {
    const trimmed = answer.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** First whole-token index of `term` in `description`, or -1. */
export function safeTermIndex(description: string, term: string): number {
  const needle = term.trim();
  if (needle.length < 2) return -1;
  const haystack = description;
  const lowerHay = haystack.toLocaleLowerCase();
  const lowerNeedle = needle.toLocaleLowerCase();
  let from = 0;
  while (from <= lowerHay.length) {
    const index = lowerHay.indexOf(lowerNeedle, from);
    if (index < 0) return -1;
    const before = index === 0 ? undefined : haystack[index - 1];
    const afterIndex = index + needle.length;
    const after = afterIndex >= haystack.length ? undefined : haystack[afterIndex];
    if (isTokenBoundary(before) && isTokenBoundary(after)) return index;
    from = index + 1;
  }
  return -1;
}

export function deriveFillBlank(card: Pick<Flashcard, "term" | "description" | "acceptedAnswers">): FillBlank | null {
  const index = safeTermIndex(card.description, card.term);
  if (index < 0) return null;
  const prompt = `${card.description.slice(0, index)}_____${card.description.slice(index + card.term.length)}`;
  if (!prompt.includes("_____")) return null;
  const acceptedAnswers = uniqueAnswers([card.term, ...card.acceptedAnswers]);
  if (acceptedAnswers.length === 0) return null;
  return { prompt, acceptedAnswers };
}

export function resolveFillBlank(card: Flashcard): FillBlank | null {
  const stored = card.fillBlank;
  if (stored && stored.prompt.trim() && stored.acceptedAnswers.some((answer) => answer.trim())) {
    return {
      prompt: stored.prompt.trim(),
      acceptedAnswers: uniqueAnswers(stored.acceptedAnswers),
    };
  }
  return deriveFillBlank(card);
}
