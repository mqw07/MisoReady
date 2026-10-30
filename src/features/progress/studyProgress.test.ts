import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import { insertCard, insertCourse, insertUnit, recordReview } from "../library/mutations.ts";
import { studyProgress } from "./studyProgress.ts";

const now = new Date("2026-10-29T16:00:00.000Z");
const yesterday = new Date("2026-10-28T16:00:00.000Z");

function seeded() {
  let state = emptyAppState();
  state = insertCourse(state, "CSC209", { id: "course-1", now }).state;
  state = insertUnit(state, "course-1", "Processes", { id: "unit-1", now })!.state;
  state = insertCard(
    state,
    "unit-1",
    { term: "fork()", description: "Creates a child process.", acceptedAnswers: [] },
    { id: "card-1", now },
  )!.state;
  state = insertCard(
    state,
    "unit-1",
    { term: "exec", description: "Replaces the process image.", acceptedAnswers: [] },
    { id: "card-2", now },
  )!.state;
  return state;
}

describe("studyProgress", () => {
  it("reports zeros and no accuracy before any review", () => {
    const progress = studyProgress(seeded(), now);
    expect(progress).toMatchObject({
      points: 0,
      currentStreak: 0,
      longestStreak: 0,
      reviewsToday: 0,
      totalReviews: 0,
      dueCount: 2,
      gradedCount: 0,
      correctCount: 0,
      accuracy: null,
    });
  });

  it("counts eligible reviews today, overall accuracy, due, and points from saved records", () => {
    let state = seeded();
    state = recordReview(
      state,
      { cardId: "card-1", rating: "good", mode: "typed", reschedule: true, correct: true },
      { id: "rev-1", now },
    )!.state;
    state = recordReview(
      state,
      { cardId: "card-2", rating: "again", mode: "reveal", reschedule: true, correct: false },
      { id: "rev-2", now },
    )!.state;

    const progress = studyProgress(state, now);
    expect(progress.reviewsToday).toBe(2);
    expect(progress.totalReviews).toBe(2);
    expect(progress.correctCount).toBe(1);
    expect(progress.gradedCount).toBe(2);
    expect(progress.accuracy).toBe(50);
    expect(progress.points).toBeGreaterThan(0);
    expect(Date.parse(state.cards[0]!.fsrs.due)).toBeGreaterThan(now.getTime());
  });

  it("does not treat custom practice or yesterday's work as today's reviews", () => {
    let state = seeded();
    state = recordReview(
      state,
      { cardId: "card-1", rating: "good", mode: "reveal", reschedule: false, correct: true },
      { id: "rev-custom", now },
    )!.state;
    state = recordReview(
      state,
      { cardId: "card-2", rating: "good", mode: "reveal", reschedule: true, correct: true },
      { id: "rev-old", now: yesterday },
    )!.state;

    const progress = studyProgress(state, now);
    expect(progress.reviewsToday).toBe(0);
    expect(progress.totalReviews).toBe(2);
    expect(progress.accuracy).toBe(100);
    expect(progress.points).toBeGreaterThan(0);
  });
});
