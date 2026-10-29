import { describe, expect, it } from "vitest";
import { emptyProgress } from "../../repositories/schema.ts";
import type { ReviewRecord } from "../../types/domain.ts";
import { awardReview } from "./award.ts";
import { localDateKey, previousLocalDateKey } from "./calendar.ts";
import { ECONOMY } from "./config.ts";

const midday = new Date(2026, 9, 29, 12, 0, 0);
const nextDay = new Date(2026, 9, 30, 12, 0, 0);
const skippedDay = new Date(2026, 10, 1, 12, 0, 0);
const beforeMidnight = new Date(2026, 9, 29, 23, 59, 0);
const afterMidnight = new Date(2026, 9, 30, 0, 0, 0);

function review(partial: Partial<ReviewRecord>): ReviewRecord {
  return {
    id: "rev-1",
    cardId: "card-1",
    reviewedAt: midday.toISOString(),
    mode: "reveal",
    rating: "good",
    pointsEarned: 0,
    eligible: true,
    correct: true,
    ...partial,
  };
}

describe("localDateKey", () => {
  it("splits days on the local midnight, not UTC", () => {
    expect(localDateKey(beforeMidnight)).toBe("2026-10-29");
    expect(localDateKey(afterMidnight)).toBe("2026-10-30");
    expect(previousLocalDateKey(afterMidnight)).toBe("2026-10-29");
  });
});

describe("awardReview", () => {
  it("pays a correct scheduled review and the daily bonuses when one card was due", () => {
    const result = awardReview(emptyProgress(), [], {
      reschedule: true,
      correct: true,
      now: midday,
      dueCountBefore: 1,
    });
    expect(result.eligible).toBe(true);
    expect(result.pointsEarned).toBe(
      ECONOMY.correctReviewPoints + ECONOMY.dailyGoalBonus + ECONOMY.streakBonus,
    );
    expect(result.progress.currentStreak).toBe(1);
    expect(result.progress.lastQualifiedStudyDate).toBe("2026-10-29");
  });

  it("does not pay custom practice or increment the streak", () => {
    const result = awardReview(emptyProgress(), [], {
      reschedule: false,
      correct: true,
      now: midday,
      dueCountBefore: 1,
    });
    expect(result).toEqual({ pointsEarned: 0, progress: emptyProgress(), eligible: false });
  });

  it("does not pay answer points for an incorrect scheduled review", () => {
    const result = awardReview(emptyProgress(), [], {
      reschedule: true,
      correct: false,
      now: midday,
      dueCountBefore: 12,
    });
    expect(result.pointsEarned).toBe(0);
    expect(result.progress.lastQualifiedStudyDate).toBeUndefined();
  });

  it("does not duplicate the daily bonus after qualification", () => {
    const first = awardReview(emptyProgress(), [], {
      reschedule: true,
      correct: true,
      now: midday,
      dueCountBefore: 1,
    });
    const second = awardReview(first.progress, [review({ pointsEarned: first.pointsEarned })], {
      reschedule: true,
      correct: true,
      now: midday,
      dueCountBefore: 0,
    });
    expect(second.pointsEarned).toBe(ECONOMY.correctReviewPoints);
    expect(second.progress.currentStreak).toBe(1);
  });

  it("increments a streak across consecutive local days and resets after a gap", () => {
    const first = awardReview(emptyProgress(), [], {
      reschedule: true,
      correct: true,
      now: midday,
      dueCountBefore: 1,
    });
    const second = awardReview(first.progress, [], {
      reschedule: true,
      correct: true,
      now: nextDay,
      dueCountBefore: 1,
    });
    expect(second.progress.currentStreak).toBe(2);
    expect(second.progress.longestStreak).toBe(2);

    const reset = awardReview(second.progress, [], {
      reschedule: true,
      correct: true,
      now: skippedDay,
      dueCountBefore: 1,
    });
    expect(reset.progress.currentStreak).toBe(1);
    expect(reset.progress.longestStreak).toBe(2);
  });

  it("qualifies after 10 scheduled reviews when many cards were due", () => {
    const nine: ReviewRecord[] = Array.from({ length: 9 }, (_, index) =>
      review({ id: `rev-${String(index)}` }),
    );
    const result = awardReview(emptyProgress(), nine, {
      reschedule: true,
      correct: true,
      now: midday,
      dueCountBefore: 15,
    });
    expect(result.pointsEarned).toBe(
      ECONOMY.correctReviewPoints + ECONOMY.dailyGoalBonus + ECONOMY.streakBonus,
    );
  });
});
