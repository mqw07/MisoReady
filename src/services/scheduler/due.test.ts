import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import type { Flashcard } from "../../types/domain.ts";
import { countDueCards, isCardDue } from "./due.ts";
import { createInitialFsrsState, deserializeFsrsCard, serializeFsrsCard } from "./fsrsCard.ts";

const now = new Date("2026-10-29T16:00:00.000Z");

function cardWithDue(due: string): Flashcard {
  return {
    id: "card-1",
    courseId: "course-1",
    unitId: "unit-1",
    term: "fork()",
    description: "Creates a new process.",
    acceptedAnswers: [],
    fsrs: { ...createInitialFsrsState(now), due },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

describe("FSRS serialization", () => {
  it("round-trips createEmptyCard through ISO timestamps", () => {
    const serialized = createInitialFsrsState(now);
    expect(serialized.due).toBe(now.toISOString());
    expect(serialized.state).toBe(State.New);
    const restored = deserializeFsrsCard(serialized);
    expect(serializeFsrsCard(restored)).toEqual(serialized);
  });
});

describe("due filtering", () => {
  it("includes cards whose due timestamp is now or earlier", () => {
    const dueNow = cardWithDue(now.toISOString());
    const dueLater = cardWithDue("2026-10-30T16:00:00.000Z");
    expect(isCardDue(dueNow, now)).toBe(true);
    expect(isCardDue(dueLater, now)).toBe(false);
    expect(countDueCards([dueNow, dueLater], now)).toBe(1);
  });
});
