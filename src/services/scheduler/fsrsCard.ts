import { createEmptyCard, type Card } from "ts-fsrs";
import type { FsrsCardState } from "../../types/domain.ts";

export function serializeFsrsCard(card: Card): FsrsCardState {
  const state: FsrsCardState = {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
  if (card.last_review) {
    state.last_review = card.last_review.toISOString();
  }
  return state;
}

export function deserializeFsrsCard(state: FsrsCardState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as Card["state"],
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };
}

export function createInitialFsrsState(now: Date = new Date()): FsrsCardState {
  return serializeFsrsCard(createEmptyCard(now));
}
