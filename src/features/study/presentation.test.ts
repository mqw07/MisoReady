import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import { insertCard, insertCourse, insertUnit } from "../library/mutations.ts";
import { pickPresentation } from "./presentation.ts";

const now = new Date("2026-10-29T16:00:00.000Z");

function libraryCard(description: string) {
  let state = emptyAppState();
  state = insertCourse(state, "CSC209", { id: "course-1", now }).state;
  state = insertUnit(state, "course-1", "Processes", { id: "unit-1", now })!.state;
  state = insertCard(
    state,
    "unit-1",
    { term: "fork()", description, acceptedAnswers: ["fork"] },
    { id: "card-1", now },
  )!.state;
  return state.cards[0]!;
}

describe("pickPresentation", () => {
  it("keeps explicit modes and rotates mixed without duplicating memory", () => {
    const withTerm = libraryCard("The fork() system call creates a child.");
    expect(pickPresentation(withTerm, "reveal", 0)).toBe("reveal");
    expect(pickPresentation(withTerm, "typed", 0)).toBe("typed");
    expect(pickPresentation(withTerm, "mixed", 0)).toBe("reveal");
    expect(pickPresentation(withTerm, "mixed", 1)).toBe("typed");
    expect(pickPresentation(withTerm, "mixed", 2)).toBe("fillBlank");
  });

  it("skips fill-blank in mixed when the card cannot host a blank", () => {
    const withoutTerm = libraryCard("Creates a new process.");
    expect(pickPresentation(withoutTerm, "mixed", 2)).toBe("reveal");
  });
});
