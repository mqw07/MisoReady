import { countEligibleOnLocalDate } from "../../services/gamification/award.ts";
import { dailyTarget, localDateKey } from "../../services/gamification/calendar.ts";
import { ECONOMY } from "../../services/gamification/config.ts";
import { countDueCards } from "../../services/scheduler/due.ts";
import type { AppState } from "../../types/domain.ts";

export function studyProgress(state: AppState, now: Date = new Date()) {
  const today = localDateKey(now);
  const due = countDueCards(state.cards, now);
  const snapshot =
    state.progress.dueSnapshotDate === today ? (state.progress.dueSnapshotCount ?? due) : due;
  const graded = state.reviews.filter((review) => review.correct !== undefined);
  const correctCount = graded.filter((review) => review.correct).length;
  return {
    points: state.progress.points,
    currentStreak: state.progress.currentStreak,
    longestStreak: state.progress.longestStreak,
    reviewsToday: countEligibleOnLocalDate(state.reviews, today),
    dailyGoal: dailyTarget(snapshot, ECONOMY.dailyGoalReviews),
    accuracy:
      graded.length === 0 ? null : Math.round((correctCount / graded.length) * 100),
  };
}
