import { awardReview } from "../../services/gamification/award.ts";
import { countDueCards } from "../../services/scheduler/due.ts";
import { createInitialFsrsState } from "../../services/scheduler/fsrsCard.ts";
import { applyRating } from "../../services/scheduler/review.ts";
import type {
  AppState,
  CardContent,
  Course,
  Flashcard,
  ReviewRating,
  ReviewRecord,
  StudyMode,
  Unit,
} from "../../types/domain.ts";

export interface MutationClock {
  id?: string;
  now?: Date;
}

function timestamp(clock: MutationClock): string {
  return (clock.now ?? new Date()).toISOString();
}

function nextId(clock: MutationClock): string {
  return clock.id ?? crypto.randomUUID();
}

export function insertCourse(
  state: AppState,
  name: string,
  clock: MutationClock = {},
): { state: AppState; course: Course } {
  const at = timestamp(clock);
  const course: Course = {
    id: nextId(clock),
    name: name.trim(),
    createdAt: at,
    updatedAt: at,
  };
  return { state: { ...state, courses: [...state.courses, course] }, course };
}

export function renameCourse(
  state: AppState,
  courseId: string,
  name: string,
  clock: MutationClock = {},
): { state: AppState; course: Course } | null {
  const index = state.courses.findIndex((course) => course.id === courseId);
  const current = state.courses[index];
  if (!current) return null;
  const course: Course = { ...current, name: name.trim(), updatedAt: timestamp(clock) };
  const courses = state.courses.slice();
  courses[index] = course;
  return { state: { ...state, courses }, course };
}

export function deleteCourse(state: AppState, courseId: string): { state: AppState; deleted: boolean } {
  if (!state.courses.some((course) => course.id === courseId)) {
    return { state, deleted: false };
  }
  const units = state.units.filter((unit) => unit.courseId !== courseId);
  const cards = state.cards.filter((card) => card.courseId !== courseId);
  const cardIds = new Set(cards.map((card) => card.id));
  return {
    deleted: true,
    state: {
      ...state,
      courses: state.courses.filter((course) => course.id !== courseId),
      units,
      cards,
      reviews: state.reviews.filter((review) => cardIds.has(review.cardId)),
    },
  };
}

export function insertUnit(
  state: AppState,
  courseId: string,
  name: string,
  clock: MutationClock = {},
): { state: AppState; unit: Unit } | null {
  if (!state.courses.some((course) => course.id === courseId)) return null;
  const at = timestamp(clock);
  const unit: Unit = {
    id: nextId(clock),
    courseId,
    name: name.trim(),
    createdAt: at,
    updatedAt: at,
  };
  return { state: { ...state, units: [...state.units, unit] }, unit };
}

export function renameUnit(
  state: AppState,
  unitId: string,
  name: string,
  clock: MutationClock = {},
): { state: AppState; unit: Unit } | null {
  const index = state.units.findIndex((unit) => unit.id === unitId);
  const current = state.units[index];
  if (!current) return null;
  const unit: Unit = { ...current, name: name.trim(), updatedAt: timestamp(clock) };
  const units = state.units.slice();
  units[index] = unit;
  return { state: { ...state, units }, unit };
}

export function deleteUnit(state: AppState, unitId: string): { state: AppState; deleted: boolean } {
  if (!state.units.some((unit) => unit.id === unitId)) {
    return { state, deleted: false };
  }
  const cards = state.cards.filter((card) => card.unitId !== unitId);
  const cardIds = new Set(cards.map((card) => card.id));
  return {
    deleted: true,
    state: {
      ...state,
      units: state.units.filter((unit) => unit.id !== unitId),
      cards,
      reviews: state.reviews.filter((review) => cardIds.has(review.cardId)),
    },
  };
}

export function insertCard(
  state: AppState,
  unitId: string,
  content: CardContent,
  clock: MutationClock = {},
): { state: AppState; card: Flashcard } | null {
  const unit = state.units.find((item) => item.id === unitId);
  if (!unit) return null;
  const at = timestamp(clock);
  const now = clock.now ?? new Date();
  const card: Flashcard = {
    id: nextId(clock),
    courseId: unit.courseId,
    unitId: unit.id,
    term: content.term,
    description: content.description,
    acceptedAnswers: content.acceptedAnswers,
    fillBlank: content.fillBlank,
    fsrs: createInitialFsrsState(now),
    createdAt: at,
    updatedAt: at,
  };
  return { state: { ...state, cards: [...state.cards, card] }, card };
}

export function insertCards(
  state: AppState,
  unitId: string,
  contents: CardContent[],
  clock: MutationClock = {},
): { state: AppState; cards: Flashcard[] } | null {
  if (!state.units.some((unit) => unit.id === unitId)) return null;
  let next = state;
  const cards: Flashcard[] = [];
  for (const content of contents) {
    const result = insertCard(next, unitId, content, { now: clock.now });
    if (!result) return null;
    next = result.state;
    cards.push(result.card);
  }
  return { state: next, cards };
}

export function updateCard(
  state: AppState,
  cardId: string,
  content: CardContent,
  clock: MutationClock = {},
): { state: AppState; card: Flashcard } | null {
  const index = state.cards.findIndex((card) => card.id === cardId);
  const current = state.cards[index];
  if (!current) return null;
  const card: Flashcard = {
    ...current,
    term: content.term,
    description: content.description,
    acceptedAnswers: content.acceptedAnswers,
    fillBlank: content.fillBlank,
    updatedAt: timestamp(clock),
  };
  const cards = state.cards.slice();
  cards[index] = card;
  return { state: { ...state, cards }, card };
}

export function deleteCard(state: AppState, cardId: string): { state: AppState; deleted: boolean } {
  if (!state.cards.some((card) => card.id === cardId)) {
    return { state, deleted: false };
  }
  return {
    deleted: true,
    state: {
      ...state,
      cards: state.cards.filter((card) => card.id !== cardId),
      reviews: state.reviews.filter((review) => review.cardId !== cardId),
    },
  };
}

export function duplicateCard(
  state: AppState,
  cardId: string,
  clock: MutationClock = {},
): { state: AppState; card: Flashcard } | null {
  const current = state.cards.find((card) => card.id === cardId);
  if (!current) return null;
  return insertCard(
    state,
    current.unitId,
    {
      term: current.term,
      description: current.description,
      acceptedAnswers: [...current.acceptedAnswers],
      fillBlank: current.fillBlank
        ? {
            prompt: current.fillBlank.prompt,
            acceptedAnswers: [...current.fillBlank.acceptedAnswers],
          }
        : undefined,
    },
    clock,
  );
}

export function moveCard(
  state: AppState,
  cardId: string,
  unitId: string,
  clock: MutationClock = {},
): { state: AppState; card: Flashcard } | null {
  const unit = state.units.find((item) => item.id === unitId);
  const index = state.cards.findIndex((card) => card.id === cardId);
  const current = state.cards[index];
  if (!unit || !current) return null;
  const card: Flashcard = {
    ...current,
    unitId: unit.id,
    courseId: unit.courseId,
    updatedAt: timestamp(clock),
  };
  const cards = state.cards.slice();
  cards[index] = card;
  return { state: { ...state, cards }, card };
}

export function courseDeleteCounts(state: AppState, courseId: string): { units: number; cards: number } {
  return {
    units: state.units.filter((unit) => unit.courseId === courseId).length,
    cards: state.cards.filter((card) => card.courseId === courseId).length,
  };
}

export function unitDeleteCounts(state: AppState, unitId: string): { cards: number } {
  return { cards: state.cards.filter((card) => card.unitId === unitId).length };
}

export function recordReview(
  state: AppState,
  input: {
    cardId: string;
    rating: ReviewRating;
    mode: StudyMode;
    reschedule: boolean;
    userAnswer?: string;
    correct?: boolean;
  },
  clock: MutationClock = {},
): { state: AppState; review: ReviewRecord; card: Flashcard } | null {
  const index = state.cards.findIndex((card) => card.id === input.cardId);
  const current = state.cards[index];
  if (!current) return null;

  const now = clock.now ?? new Date();
  const at = now.toISOString();
  const dueCountBefore = countDueCards(state.cards, now);
  const correct = input.correct ?? input.rating !== "again";
  const award = awardReview(state.progress, state.reviews, {
    reschedule: input.reschedule,
    correct,
    now,
    dueCountBefore,
  });

  const card: Flashcard = input.reschedule
    ? {
        ...current,
        fsrs: applyRating(current.fsrs, input.rating, now),
        updatedAt: at,
      }
    : current;

  const review: ReviewRecord = {
    id: nextId(clock),
    cardId: current.id,
    reviewedAt: at,
    mode: input.mode,
    rating: input.rating,
    userAnswer: input.userAnswer,
    pointsEarned: award.pointsEarned,
    eligible: award.eligible,
    correct,
  };

  const cards = state.cards.slice();
  cards[index] = card;
  return {
    state: {
      ...state,
      cards,
      reviews: [...state.reviews, review],
      progress: award.progress,
    },
    review,
    card,
  };
}
