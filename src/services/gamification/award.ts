import type { ReviewRecord, UserProgress } from "../../types/domain.ts";
import { dailyTarget, localDateKey, previousLocalDateKey } from "./calendar.ts";
import { ECONOMY } from "./config.ts";

export function countEligibleOnLocalDate(
  reviews: readonly ReviewRecord[],
  dateKey: string,
): number {
  return reviews.reduce((total, review) => {
    if (!review.eligible) return total;
    return localDateKey(new Date(review.reviewedAt)) === dateKey ? total + 1 : total;
  }, 0);
}

export function awardReview(
  progress: UserProgress,
  reviews: readonly ReviewRecord[],
  input: {
    reschedule: boolean;
    correct: boolean;
    now: Date;
    dueCountBefore: number;
  },
): { pointsEarned: number; progress: UserProgress; eligible: boolean } {
  const eligible = input.reschedule;
  if (!eligible) {
    return { pointsEarned: 0, progress, eligible: false };
  }

  const today = localDateKey(input.now);
  const snapshotDate = progress.dueSnapshotDate === today ? progress.dueSnapshotDate : today;
  const snapshotCount =
    progress.dueSnapshotDate === today ? (progress.dueSnapshotCount ?? input.dueCountBefore) : input.dueCountBefore;

  let pointsEarned = input.correct ? ECONOMY.correctReviewPoints : 0;
  const alreadyToday = countEligibleOnLocalDate(reviews, today);
  const nextCount = alreadyToday + 1;
  const alreadyQualified = progress.lastQualifiedStudyDate === today;
  const target = dailyTarget(snapshotCount, ECONOMY.dailyGoalReviews);
  const qualifies = !alreadyQualified && nextCount >= target;

  let nextProgress: UserProgress = {
    ...progress,
    dueSnapshotDate: snapshotDate,
    dueSnapshotCount: snapshotCount,
  };

  if (qualifies) {
    pointsEarned += ECONOMY.dailyGoalBonus + ECONOMY.streakBonus;
    const currentStreak =
      progress.lastQualifiedStudyDate === previousLocalDateKey(input.now) ? progress.currentStreak + 1 : 1;
    nextProgress = {
      ...nextProgress,
      points: progress.points + pointsEarned,
      currentStreak,
      longestStreak: Math.max(progress.longestStreak, currentStreak),
      lastQualifiedStudyDate: today,
    };
  } else {
    nextProgress = {
      ...nextProgress,
      points: progress.points + pointsEarned,
    };
  }

  return { pointsEarned, progress: nextProgress, eligible: true };
}
