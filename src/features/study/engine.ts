import { matchAnswer, type AnswerMatch } from "../../services/answerMatching/matchAnswer.ts";
import type { AppState, Flashcard, ReviewRating } from "../../types/domain.ts";
import { parseStudyParams, studySessionKey, type SessionKind, type StudyParams } from "./params.ts";
import {
  presentationsForQueue,
  recallAnswers,
  type CardPresentation,
} from "./presentation.ts";
import { selectStudyCards } from "./session.ts";
import type { ReviewVerdict } from "../../services/ai/review.ts";

export type StudyPhase = "front" | "back" | "done" | "empty";

export interface StudyAttempt {
  aiReview?: ReviewVerdict;
  cardId: string;
  rating: ReviewRating;
  mode: CardPresentation;
  userAnswer?: string;
  correct: boolean;
}

export interface StudyEngine {
  aiReview?: ReviewVerdict;
  aiPending?: boolean;
  aiError?: string;
  reviewIds: string[];
  key: string;
  params: StudyParams;
  kind: SessionKind;
  queue: Flashcard[];
  presentations: CardPresentation[];
  index: number;
  phase: StudyPhase;
  submitted: string[];
  ratings: ReviewRating[];
  recallCorrect: number;
  recallGraded: number;
  answer?: string;
  match?: AnswerMatch;
}

export function createStudyEngine(
  cards: Flashcard[],
  search: URLSearchParams,
  now: Date = new Date(),
): StudyEngine {
  const params = parseStudyParams(search);
  const queue = selectStudyCards(cards, params, now);
  return {
    reviewIds: [],
    key: studySessionKey(params),
    params,
    kind: params.kind,
    queue,
    presentations: presentationsForQueue(queue, params.mode),
    index: 0,
    phase: queue.length === 0 ? "empty" : "front",
    submitted: [],
    ratings: [],
    recallCorrect: 0,
    recallGraded: 0,
  };
}

/** Restore only committed ratings; an unfinished answer is safe to enter again. */
export function restoreStudyEngine(state: AppState, search: URLSearchParams): StudyEngine {
  const fresh = createStudyEngine(state.cards, search);
  const saved = state.studySession;
  if (!saved || saved.key !== fresh.key) return fresh;
  if (new Set(saved.cardIds).size !== saved.cardIds.length || new Set(saved.reviewIds).size !== saved.reviewIds.length) return fresh;
  const queue = saved.cardIds.map((id) => state.cards.find((card) => card.id === id));
  const reviews = saved.reviewIds.map((id) => state.reviews.find((review) => review.id === id));
  // Deleted cards or missing history invalidate the checkpoint, never the library.
  if (queue.some((card) => !card) || reviews.some((review, index) => !review || review.cardId !== saved.cardIds[index])) return fresh;
  const cards = queue as Flashcard[];
  const records = reviews as AppState["reviews"];
  if (records.length > cards.length) return fresh;
  return {
    ...fresh, queue: cards, presentations: presentationsForQueue(cards, fresh.params.mode),
    reviewIds: saved.reviewIds, submitted: records.map((review) => review.cardId),
    ratings: records.map((review) => review.rating),
    index: Math.min(records.length, Math.max(0, cards.length - 1)),
    phase: cards.length === 0 ? "empty" : records.length === cards.length ? "done" : "front",
    recallCorrect: records.filter((review) => review.mode !== "reveal" && review.correct).length,
    recallGraded: records.filter((review) => review.mode !== "reveal").length,
  };
}

export function currentCard(engine: StudyEngine): Flashcard | undefined {
  return engine.queue[engine.index];
}

export function currentPresentation(engine: StudyEngine): CardPresentation {
  return engine.presentations[engine.index] ?? "reveal";
}

export function isRecallPresentation(presentation: CardPresentation): boolean {
  return presentation === "typed" || presentation === "fillBlank";
}

export function displayedRecallCorrect(engine: StudyEngine): number {
  const pending =
    engine.phase === "back" &&
    isRecallPresentation(currentPresentation(engine)) &&
    engine.match?.correct
      ? 1
      : 0;
  return engine.recallCorrect + pending;
}

export function revealCard(engine: StudyEngine): StudyEngine {
  if (engine.phase !== "front") return engine;
  if (currentPresentation(engine) !== "reveal") return engine;
  return { ...engine, phase: "back" };
}

export function gradeCard(engine: StudyEngine, input: string): StudyEngine {
  if (engine.phase !== "front") return engine;
  if (engine.answer !== undefined) return engine;
  const presentation = currentPresentation(engine);
  if (presentation === "reveal") return engine;
  const card = engine.queue[engine.index];
  if (!card) return engine;
  const answers = recallAnswers(card, presentation);
  const canonical = answers[0] ?? "";
  const match = matchAnswer(input, canonical, answers.slice(1));
  return { ...engine, phase: "back", answer: input, match };
}

export function rateCard(
  engine: StudyEngine,
  rating: ReviewRating,
): { engine: StudyEngine; attempt: StudyAttempt | null } {
  if (engine.phase !== "back" || engine.aiPending) return { engine, attempt: null };
  const card = engine.queue[engine.index];
  if (!card) return { engine, attempt: null };
  if (engine.submitted.includes(card.id)) return { engine, attempt: null };

  const presentation = currentPresentation(engine);
  const correct = presentation === "reveal" ? rating !== "again" : Boolean(engine.match?.correct);
  const recall = isRecallPresentation(presentation);
  const submitted = [...engine.submitted, card.id];
  const ratings = [...engine.ratings, rating];
  const nextIndex = engine.index + 1;
  const done = nextIndex >= engine.queue.length;
  return {
    attempt: {
      aiReview: engine.aiReview,
      cardId: card.id,
      rating,
      mode: presentation,
      userAnswer: engine.answer,
      correct,
    },
    engine: {
      ...engine,
      submitted,
      ratings,
      recallCorrect: engine.recallCorrect + (recall && correct ? 1 : 0),
      recallGraded: engine.recallGraded + (recall ? 1 : 0),
      index: done ? engine.index : nextIndex,
      phase: done ? "done" : "front",
      answer: undefined,
      match: undefined,
      aiReview: undefined,
      aiPending: false,
      aiError: undefined,
    },
  };
}

export function applyAiReview(engine: StudyEngine, verdict: ReviewVerdict): StudyEngine {
  if (engine.phase !== "back" || !engine.match || currentPresentation(engine) === "reveal") return engine;
  return {
    ...engine, aiPending: false, aiError: undefined, aiReview: verdict,
    match: verdict.correct ? { correct: true, matchType: "ai" } : engine.match,
  };
}

export function ratingCounts(ratings: readonly ReviewRating[]): Record<ReviewRating, number> {
  const counts: Record<ReviewRating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const rating of ratings) counts[rating] += 1;
  return counts;
}
