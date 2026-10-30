import { levenshtein, maxEdits } from "./levenshtein.ts";
import { normalizeAnswer } from "./normalize.ts";

export type MatchType = "exact" | "alias" | "fuzzy" | "none" | "ai";

export interface AnswerMatch {
  correct: boolean;
  matchType: MatchType;
  matchedAnswer?: string;
  distance?: number;
}

/** Requires a space before `(`, so `fork()` and `wait(2)` are not split. */
const PARENTHETICAL_TERM = /^(.+?)\s+\(([^)]+)\)\s*$/;

export function parentheticalForms(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const match = PARENTHETICAL_TERM.exec(trimmed);
  if (!match) return [trimmed];
  const outside = match[1]?.trim() ?? "";
  const inside = match[2]?.trim() ?? "";
  const forms = [trimmed];
  if (outside && outside !== trimmed) forms.push(outside);
  if (inside && inside !== trimmed && inside !== outside) forms.push(inside);
  return forms;
}

function uniqueForms(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function matchAnswer(
  input: string,
  canonical: string,
  aliases: readonly string[] = [],
): AnswerMatch {
  const user = normalizeAnswer(input);
  if (user.length === 0) {
    return { correct: false, matchType: "none" };
  }

  const canonicalNormalized = normalizeAnswer(canonical);
  if (canonicalNormalized.length > 0 && user === canonicalNormalized) {
    return { correct: true, matchType: "exact", matchedAnswer: canonical, distance: 0 };
  }

  const expandedAliases = uniqueForms([
    ...parentheticalForms(canonical).slice(1),
    ...aliases.flatMap((alias) => parentheticalForms(alias)),
  ]).filter((form) => form !== canonical);

  for (const alias of expandedAliases) {
    const aliasNormalized = normalizeAnswer(alias);
    if (aliasNormalized.length > 0 && user === aliasNormalized) {
      return { correct: true, matchType: "alias", matchedAnswer: alias, distance: 0 };
    }
  }

  let best: { answer: string; distance: number } | null = null;
  const candidates = [canonical, ...expandedAliases];
  for (const answer of candidates) {
    const expected = normalizeAnswer(answer);
    if (expected.length === 0) continue;
    const allowed = maxEdits(expected.length);
    if (allowed === 0) continue;
    const distance = levenshtein(user, expected);
    if (distance === 0 || distance > allowed) continue;
    if (!best || distance < best.distance) {
      best = { answer, distance };
    }
  }

  if (!best) {
    return { correct: false, matchType: "none" };
  }

  return {
    correct: true,
    matchType: "fuzzy",
    matchedAnswer: best.answer,
    distance: best.distance,
  };
}
