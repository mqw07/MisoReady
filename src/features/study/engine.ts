import { matchAnswer, type AnswerMatch } from "../../services/answerMatching/matchAnswer.ts";
import type { Flashcard, ReviewRating } from "../../types/domain.ts";
import { parseStudyParams, studySessionKey, type SessionKind, type StudyParams } from "./params.ts";
import {
  presentationsForQueue,
  recallAnswers,
  type CardPresentation,
} from "./presentation.ts";
import { selectStudyCards } from "./session.ts";

export type StudyPhase = "front" | "back" | "done" | "empty";

export interface StudyAttempt {
  cardId: string;
  rating: ReviewRating;
  mode: CardPresentation;
  userAnswer?: string;
  correct: boolean;
}

export interface StudyEngine {
  key: string;
  params: StudyParams;
  kind: SessionKind;
  queue: Flashcard[];
  presentations: CardPresentation[];
  index: number;
  phase: StudyPhase;
  submitted: string[];
  ratings: ReviewRating[];
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
    key: studySessionKey(params),
    params,
    kind: params.kind,
    queue,
    presentations: presentationsForQueue(queue, params.mode),
    index: 0,
    phase: queue.length === 0 ? "empty" : "front",
    submitted: [],
    ratings: [],
  };
}

export function currentCard(engine: StudyEngine): Flashcard | undefined {
  return engine.queue[engine.index];
}

export function currentPresentation(engine: StudyEngine): CardPresentation {
  return engine.presentations[engine.index] ?? "reveal";
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
  if (engine.phase !== "back") return { engine, attempt: null };
  const card = engine.queue[engine.index];
  if (!card) return { engine, attempt: null };
  if (engine.submitted.includes(card.id)) return { engine, attempt: null };

  const presentation = currentPresentation(engine);
  const correct = presentation === "reveal" ? rating !== "again" : Boolean(engine.match?.correct);
  const submitted = [...engine.submitted, card.id];
  const ratings = [...engine.ratings, rating];
  const nextIndex = engine.index + 1;
  const done = nextIndex >= engine.queue.length;
  return {
    attempt: {
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
      index: done ? engine.index : nextIndex,
      phase: done ? "done" : "front",
      answer: undefined,
      match: undefined,
    },
  };
}

export function ratingCounts(ratings: readonly ReviewRating[]): Record<ReviewRating, number> {
  const counts: Record<ReviewRating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const rating of ratings) counts[rating] += 1;
  return counts;
}
