import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import { countDueCards, isCardDue } from "../../services/scheduler/due.ts";
import {
  deleteCourse,
  deleteUnit,
  duplicateCard,
  insertCard,
  insertCards,
  insertCourse,
  insertUnit,
  moveCard,
  renameCourse,
  updateCard,
} from "./mutations.ts";

const now = new Date("2026-10-29T16:00:00.000Z");
const later = new Date("2026-11-01T16:00:00.000Z");

function seededLibrary() {
  let state = emptyAppState();
  const course = insertCourse(state, "CSC209", { id: "course-1", now });
  state = course.state;
  const unit = insertUnit(state, "course-1", "Processes", { id: "unit-1", now })!;
  state = unit.state;
  const otherUnit = insertUnit(state, "course-1", "Memory", { id: "unit-2", now })!;
  state = otherUnit.state;
  const card = insertCard(
    state,
    "unit-1",
    {
      term: "fork()",
      description: "Creates a new process.",
      acceptedAnswers: ["fork"],
      fillBlank: {
        prompt: "_____ creates a new process.",
        acceptedAnswers: ["fork()", "fork"],
      },
    },
    { id: "card-1", now },
  )!;
  return { state: card.state, course: course.course, unit: unit.unit, card: card.card };
}

describe("library mutations", () => {
  it("creates courses and units with timestamps", () => {
    const { state } = seededLibrary();
    expect(state.courses).toHaveLength(1);
    expect(state.units).toHaveLength(2);
    expect(state.courses[0]?.updatedAt).toBe(now.toISOString());
  });

  it("renames a course", () => {
    const seeded = seededLibrary();
    const renamed = renameCourse(seeded.state, "course-1", "Operating Systems", { now: later });
    expect(renamed?.course.name).toBe("Operating Systems");
    expect(renamed?.course.updatedAt).toBe(later.toISOString());
  });

  it("cascade-deletes a course, its units, and its cards", () => {
    const { state } = seededLibrary();
    const removed = deleteCourse(state, "course-1");
    expect(removed.deleted).toBe(true);
    expect(removed.state.courses).toEqual([]);
    expect(removed.state.units).toEqual([]);
    expect(removed.state.cards).toEqual([]);
  });

  it("cascade-deletes a unit and its cards only", () => {
    const { state } = seededLibrary();
    const removed = deleteUnit(state, "unit-1");
    expect(removed.state.units.map((unit) => unit.name)).toEqual(["Memory"]);
    expect(removed.state.cards).toEqual([]);
    expect(removed.state.courses).toHaveLength(1);
  });

  it("commits generated drafts as new FSRS cards without sharing ids", () => {
    const { state } = seededLibrary();
    const result = insertCards(
      state,
      "unit-1",
      [
        { term: "exec", description: "Replaces the process image.", acceptedAnswers: [] },
        { term: "pipe", description: "Connects processes.", acceptedAnswers: ["pipeline"] },
      ],
      { now },
    );
    expect(result?.cards).toHaveLength(2);
    expect(new Set(result?.cards.map((card) => card.id)).size).toBe(2);
    expect(result?.cards.every((card) => card.fsrs.state === State.New)).toBe(true);
    expect(result?.cards.every((card) => isCardDue(card, now))).toBe(true);
    expect(result?.state.cards).toHaveLength(3);
  });

  it("initializes new cards as due with FSRS New state", () => {
    const { card } = seededLibrary();
    expect(card.fsrs.state).toBe(State.New);
    expect(isCardDue(card, now)).toBe(true);
    expect(countDueCards([card], now)).toBe(1);
    expect(isCardDue(card, new Date("2026-10-29T15:00:00.000Z"))).toBe(false);
  });

  it("edits card content without resetting FSRS state", () => {
    const seeded = seededLibrary();
    const scheduled = {
      ...seeded.state,
      cards: [
        {
          ...seeded.card,
          fsrs: { ...seeded.card.fsrs, due: later.toISOString(), state: 2, reps: 3 },
        },
      ],
    };
    const updated = updateCard(
      scheduled,
      "card-1",
      {
        term: "fork",
        description: "Duplicates the calling process.",
        acceptedAnswers: ["fork()"],
      },
      { now: later },
    );
    expect(updated?.card.term).toBe("fork");
    expect(updated?.card.fsrs.due).toBe(later.toISOString());
    expect(updated?.card.fsrs.reps).toBe(3);
  });

  it("duplicates content with a fresh FSRS schedule", () => {
    const seeded = seededLibrary();
    const scheduled = {
      ...seeded.state,
      cards: [{ ...seeded.card, fsrs: { ...seeded.card.fsrs, due: later.toISOString(), reps: 4 } }],
    };
    const copy = duplicateCard(scheduled, "card-1", { id: "card-2", now });
    expect(copy?.card.id).toBe("card-2");
    expect(copy?.card.term).toBe("fork()");
    expect(copy?.card.fillBlank?.prompt).toBe("_____ creates a new process.");
    expect(copy?.card.fsrs.due).toBe(now.toISOString());
    expect(copy?.card.fsrs.reps).toBe(0);
    expect(copy?.card.fsrs.state).toBe(State.New);
  });

  it("moves a card to another unit and keeps the schedule", () => {
    const { state, card } = seededLibrary();
    const moved = moveCard(state, card.id, "unit-2", { now: later });
    expect(moved?.card.unitId).toBe("unit-2");
    expect(moved?.card.courseId).toBe("course-1");
    expect(moved?.card.fsrs.due).toBe(card.fsrs.due);
  });
});
