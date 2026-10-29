import { fsrs, Rating } from "ts-fsrs";
import type { ReviewRating } from "../../types/domain.ts";
import type { FsrsCardState } from "../../types/domain.ts";
import { deserializeFsrsCard, serializeFsrsCard } from "./fsrsCard.ts";

const GRADE = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

const scheduler = fsrs({ enable_fuzz: false });

export function applyRating(state: FsrsCardState, rating: ReviewRating, now: Date = new Date()): FsrsCardState {
  const card = deserializeFsrsCard(state);
  const next = scheduler.next(card, now, GRADE[rating]);
  return serializeFsrsCard(next.card);
}
