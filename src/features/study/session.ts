import { isCardDue } from "../../services/scheduler/due.ts";
import type { Flashcard } from "../../types/domain.ts";
import { resolveFillBlank } from "./fillBlank.ts";
import type { StudyParams } from "./params.ts";

export function selectStudyCards(cards: Flashcard[], params: StudyParams, now: Date = new Date()): Flashcard[] {
  let pool = cards;
  if (params.courseId) pool = pool.filter((card) => card.courseId === params.courseId);
  if (params.unitId) pool = pool.filter((card) => card.unitId === params.unitId);
  if (params.kind === "scheduled") {
    pool = pool.filter((card) => isCardDue(card, now));
  }
  if (params.mode === "fillBlank") {
    pool = pool.filter((card) => resolveFillBlank(card) !== null);
  }
  return pool;
}

export function sessionProgress(index: number, total: number): { current: number; total: number } {
  if (total === 0) return { current: 0, total: 0 };
  return { current: Math.min(index + 1, total), total };
}
