import type { AppState, Course, Flashcard, MisoState, ReviewRecord, Unit, UserProgress } from "../types/domain.ts";
import type {
  CardRepository,
  CourseRepository,
  MisoRepository,
  ProgressRepository,
  ReviewRepository,
  UnitRepository,
} from "./interfaces.ts";

export const courses: CourseRepository = {
  list: (state) => state.courses,
  get: (state, id) => state.courses.find((course) => course.id === id),
};

export const units: UnitRepository = {
  list: (state) => state.units,
  listByCourse: (state, courseId) => state.units.filter((unit) => unit.courseId === courseId),
  get: (state, id) => state.units.find((unit) => unit.id === id),
};

export const cards: CardRepository = {
  list: (state) => state.cards,
  listByCourse: (state, courseId) => state.cards.filter((card) => card.courseId === courseId),
  listByUnit: (state, unitId) => state.cards.filter((card) => card.unitId === unitId),
  get: (state, id) => state.cards.find((card) => card.id === id),
};

export const reviews: ReviewRepository = {
  list: (state) => state.reviews,
};

export const progress: ProgressRepository = {
  get: (state) => state.progress,
};

export const miso: MisoRepository = {
  get: (state) => state.miso,
};

export function listCourses(state: AppState): Course[] {
  return courses.list(state);
}

export function listUnitsForCourse(state: AppState, courseId: string): Unit[] {
  return units.listByCourse(state, courseId);
}

export function listCardsForCourse(state: AppState, courseId: string): Flashcard[] {
  return cards.listByCourse(state, courseId);
}

export function listCardsForUnit(state: AppState, unitId: string): Flashcard[] {
  return cards.listByUnit(state, unitId);
}

export function listReviews(state: AppState): ReviewRecord[] {
  return reviews.list(state);
}

export function getProgress(state: AppState): UserProgress {
  return progress.get(state);
}

export function getMiso(state: AppState): MisoState {
  return miso.get(state);
}
