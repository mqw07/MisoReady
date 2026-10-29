import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import type { Flashcard } from "../../types/domain.ts";
import { insertCard, insertCourse, insertUnit, recordReview } from "../library/mutations.ts";
import { createStudyEngine, gradeCard, rateCard, ratingCounts, revealCard } from "./engine.ts";
import { sessionProgress } from "./session.ts";

const now = new Date("2026-10-29T16:00:00.000Z");
const later = new Date("2026-11-02T16:00:00.000Z");

function twoCards(): Flashcard[] {
  let state = emptyAppState();
  state = insertCourse(state, "CSC209", { id: "course-1", now }).state;
  state = insertUnit(state, "course-1", "Processes", { id: "unit-1", now })!.state;
  state = insertCard(
    state,
    "unit-1",
    { term: "fork()", description: "Creates a child process.", acceptedAnswers: ["fork"] },
    { id: "card-1", now },
  )!.state;
  state = insertCard(
    state,
    "unit-1",
    { term: "exec", description: "Replaces the process image.", acceptedAnswers: [] },
    { id: "card-2", now },
  )!.state;
  return state.cards;
}

describe("study engine", () => {
  it("builds a scheduled queue from due cards", () => {
    const engine = createStudyEngine(twoCards(), new URLSearchParams("scope=due"), now);
    expect(engine.kind).toBe("scheduled");
    expect(engine.queue).toHaveLength(2);
    expect(engine.phase).toBe("front");
  });

  it("excludes future cards from scheduled sessions", () => {
    const cards = twoCards();
    cards[0] = { ...cards[0]!, fsrs: { ...cards[0]!.fsrs, due: later.toISOString() } };
    const engine = createStudyEngine(cards, new URLSearchParams("scope=due"), now);
    expect(engine.queue.map((card) => card.id)).toEqual(["card-2"]);
  });

  it("includes future cards in custom Study All", () => {
    const cards = twoCards();
    cards[0] = { ...cards[0]!, fsrs: { ...cards[0]!.fsrs, due: later.toISOString() } };
    const engine = createStudyEngine(cards, new URLSearchParams("scope=all"), now);
    expect(engine.kind).toBe("custom");
    expect(engine.queue).toHaveLength(2);
  });

  it("reveals, rates once, and finishes without a second event", () => {
    let engine = createStudyEngine(twoCards(), new URLSearchParams("scope=due"), now);
    expect(rateCard(engine, "good").attempt).toBeNull();

    engine = revealCard(engine);
    expect(engine.phase).toBe("back");
    const first = rateCard(engine, "good");
    expect(first.attempt).toEqual({
      cardId: "card-1",
      rating: "good",
      mode: "reveal",
      userAnswer: undefined,
      correct: true,
    });

    const duplicate = rateCard({ ...engine, submitted: first.engine.submitted }, "easy");
    expect(duplicate.attempt).toBeNull();

    engine = revealCard(first.engine);
    const second = rateCard(engine, "again");
    expect(second.attempt).toEqual({
      cardId: "card-2",
      rating: "again",
      mode: "reveal",
      userAnswer: undefined,
      correct: false,
    });
    expect(second.engine.phase).toBe("done");
    expect(second.engine.submitted).toEqual(["card-1", "card-2"]);
    expect(ratingCounts(second.engine.ratings)).toEqual({ again: 1, hard: 0, good: 1, easy: 0 });
  });

  it("grades a typed answer once before rating", () => {
    let engine = createStudyEngine(twoCards(), new URLSearchParams("scope=due&mode=typed"), now);
    expect(revealCard(engine).phase).toBe("front");
    expect(rateCard(engine, "good").attempt).toBeNull();

    engine = gradeCard(engine, "Fork()");
    expect(engine.match?.correct).toBe(true);
    expect(engine.match?.matchType).toBe("exact");
    expect(gradeCard(engine, "exec").match?.matchedAnswer).toBe("fork()");

    const rated = rateCard(engine, "good");
    expect(rated.attempt).toEqual({
      cardId: "card-1",
      rating: "good",
      mode: "typed",
      userAnswer: "Fork()",
      correct: true,
    });
  });

  it("reports 1-based progress without overflowing the queue", () => {
    expect(sessionProgress(0, 0)).toEqual({ current: 0, total: 0 });
    expect(sessionProgress(0, 3)).toEqual({ current: 1, total: 3 });
    expect(sessionProgress(2, 3)).toEqual({ current: 3, total: 3 });
  });
});

describe("recordReview", () => {
  it("updates FSRS for scheduled reviews and leaves custom practice unscheduled", () => {
    let state = emptyAppState();
    state = insertCourse(state, "CSC209", { id: "course-1", now }).state;
    state = insertUnit(state, "course-1", "Processes", { id: "unit-1", now })!.state;
    state = insertCard(
      state,
      "unit-1",
      { term: "fork()", description: "Creates a child process.", acceptedAnswers: [] },
      { id: "card-1", now },
    )!.state;
    const due = state.cards[0]!.fsrs.due;

    const scheduled = recordReview(
      state,
      { cardId: "card-1", rating: "good", mode: "reveal", reschedule: true },
      { id: "rev-1", now },
    )!;
    expect(scheduled.review.pointsEarned).toBeGreaterThan(0);
    expect(scheduled.review.eligible).toBe(true);
    expect(scheduled.state.progress.points).toBe(scheduled.review.pointsEarned);
    expect(Date.parse(scheduled.card.fsrs.due)).toBeGreaterThan(now.getTime());
    expect(scheduled.state.reviews).toHaveLength(1);

    const custom = recordReview(
      state,
      { cardId: "card-1", rating: "good", mode: "reveal", reschedule: false },
      { id: "rev-2", now },
    )!;
    expect(custom.card.fsrs.due).toBe(due);
    expect(custom.review.pointsEarned).toBe(0);
    expect(custom.review.eligible).toBe(false);
    expect(custom.state.progress.points).toBe(0);
    expect(custom.state.reviews).toHaveLength(1);
  });
});
