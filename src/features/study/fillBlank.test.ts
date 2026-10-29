import { describe, expect, it } from "vitest";
import type { Flashcard } from "../../types/domain.ts";
import { deriveFillBlank, resolveFillBlank, safeTermIndex } from "./fillBlank.ts";

const base = {
  id: "card-1",
  courseId: "course-1",
  unitId: "unit-1",
  acceptedAnswers: ["fork"] as string[],
  fsrs: {
    due: "2026-10-29T16:00:00.000Z",
    stability: 0,
    difficulty: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
  },
  createdAt: "2026-10-29T16:00:00.000Z",
  updatedAt: "2026-10-29T16:00:00.000Z",
};

function card(partial: Partial<Flashcard>): Flashcard {
  return {
    ...base,
    term: "fork()",
    description: "The fork() system call creates a child.",
    ...partial,
  };
}

describe("safeTermIndex", () => {
  it("finds a whole-token term including punctuation", () => {
    expect(safeTermIndex("The fork() system call creates a child.", "fork()")).toBe(4);
  });

  it("does not blank a prefix of a longer word", () => {
    expect(safeTermIndex("This process creates processes.", "process")).toBe(5);
    expect(safeTermIndex("These processes share memory.", "process")).toBe(-1);
  });

  it("keeps C++ intact as a token", () => {
    expect(safeTermIndex("C++ is compiled.", "C++")).toBe(0);
    expect(safeTermIndex("See CPU usage.", "C")).toBe(-1);
  });
});

describe("deriveFillBlank", () => {
  it("replaces the first safe occurrence and keeps aliases", () => {
    expect(deriveFillBlank(card({}))).toEqual({
      prompt: "The _____ system call creates a child.",
      acceptedAnswers: ["fork()", "fork"],
    });
  });

  it("returns null when the term is not a whole token", () => {
    expect(
      deriveFillBlank(
        card({
          term: "process",
          description: "These processes share memory.",
          acceptedAnswers: [],
        }),
      ),
    ).toBeNull();
  });
});

describe("resolveFillBlank", () => {
  it("prefers a stored prompt over a derived blank", () => {
    expect(
      resolveFillBlank(
        card({
          fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
        }),
      ),
    ).toEqual({
      prompt: "_____ creates a new process.",
      acceptedAnswers: ["fork()"],
    });
  });
});
