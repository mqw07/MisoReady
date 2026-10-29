import { levenshtein, maxEdits } from "./levenshtein.ts";
import { normalizeAnswer } from "./normalize.ts";

export type MatchType = "exact" | "alias" | "fuzzy" | "none";

export interface AnswerMatch {
  correct: boolean;
  matchType: MatchType;
  matchedAnswer?: string;
  distance?: number;
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

  for (const alias of aliases) {
    const aliasNormalized = normalizeAnswer(alias);
    if (aliasNormalized.length > 0 && user === aliasNormalized) {
      return { correct: true, matchType: "alias", matchedAnswer: alias, distance: 0 };
    }
  }

  let best: { answer: string; distance: number } | null = null;
  const candidates = [canonical, ...aliases];
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
