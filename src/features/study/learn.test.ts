import { describe, it, expect } from "vitest";
import { startLearn, submit, question, reconcileLearn, grade, learnSchema, types } from "./learn.ts";
import { emptyAppState, persistedAppStateSchema } from "../../repositories/schema.ts";
import type { Flashcard } from "../../types/domain.ts";

const cards: Flashcard[] = ["Alpha", "Beta", "Gamma", "Delta"].map((term, index) => ({
  id: String(index), term, description: `Definition ${index}`, acceptedAnswers: [term + " alias"],
  courseId: "course", unitId: "unit", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  fsrs: { due: "2026-01-01", stability: 0, difficulty: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0 },
}));

describe("Learn", () => {
  it("starts with input and reaches recall mastery without changing schedules", () => {
    let session = startLearn(cards.slice(0, 2), "test");
    expect(types).not.toContain("multipleChoice");
    expect(question(session, cards)?.type).toBe("written");
    for (let index = 0; index < 20 && session.queue.length; index++) {
      session = submit(session, cards, question(session, cards)!.answers[0]!);
    }
    expect(session.queue).toEqual([]);
    expect(session.progress.every(item => item.recall === 2 && item.recognition === 0)).toBe(true);
    expect(cards[0]!.fsrs.reps).toBe(0);
    expect(new Set(session.attempts.map(attempt => attempt.id)).size).toBe(session.attempts.length);
    expect(new Set(session.attempts.map(attempt => attempt.type))).toEqual(new Set(["written", "fillBlank"]));
  });

  it("rotates selected formats per card, beginning with input even when flashcards are enabled", () => {
    let session = startLearn(cards.slice(0, 1), "test");
    session.types = ["flashcard", "written", "fillBlank"];
    expect(question(session, cards)?.type).toBe("written");
    session = submit(session, cards, "Alpha");
    expect(question(session, cards)?.type).toBe("flashcard");
    session = submit(session, cards, "remembered");
    expect(question(session, cards)?.type).toBe("fillBlank");
    session = submit(session, cards, "Alpha");
    expect(session.queue).toEqual([]);
  });

  it("requeues mistakes after intervening cards and hints do not advance recall", () => {
    let session = startLearn(cards, "test");
    session.types = ["written"];
    session = submit(session, cards, "wrong");
    expect(session.queue).toEqual(["1", "2", "0", "3"]);
    expect(session.progress[0]!.mistakes).toBe(1);
    session = submit(session, cards, question(session, cards)!.answers[0]!, true);
    expect(session.progress[1]!.recall).toBe(0);
  });

  it("supports exact grading, directional answers and a one-card deck", () => {
    const session = startLearn(cards.slice(0, 1), "test");
    session.types = ["written"];
    expect(grade(session, cards, "alpha")).toBe(true);
    session.smart = false;
    expect(grade(session, cards, "alpha")).toBe(false);
    expect(grade(session, cards, "Alpha alias")).toBe(true);
    session.direction = "definition";
    expect(grade(session, cards, "Definition 0")).toBe(true);
    expect(grade(session, cards, "Alpha")).toBe(false);
  });

  it("uses stored blank prompts and their answers", () => {
    const pool = [{ ...cards[0]!, fillBlank: { prompt: "_____ is first.", acceptedAnswers: ["Alpha", "A"] } }];
    const session = startLearn(pool, "test");
    session.types = ["fillBlank"];
    expect(question(session, pool)?.prompt).toBe("_____ is first.");
    expect(grade(session, pool, "A")).toBe(true);
    expect(grade(session, pool, "Beta")).toBe(false);
  });

  it("derives blanks or falls back to a definition without stored blank data", () => {
    const session = startLearn(cards, "test");
    session.types = ["fillBlank"];
    expect(question(session, cards)?.prompt).toBe("_____ — Definition 0");
    const withTerm = [{ ...cards[0]!, description: "Alpha is the first letter." }];
    expect(question(session, withTerm)?.prompt).toBe("_____ is the first letter.");
    expect(grade(session, withTerm, "alpha alias")).toBe(true);
    session.direction = "definition";
    expect(question(session, withTerm)).toBeNull();
  });

  it("retains flashcard-only and true/false-only practice", () => {
    let session = startLearn(cards, "test");
    session.types = ["flashcard"];
    session = submit(session, cards, "remembered");
    expect(session.progress[0]!.mastered).toBe(true);
    session = startLearn(cards.slice(0, 2), "test");
    session.types = ["trueFalse"];
    for (let index = 0; index < 4; index++) session = submit(session, cards, String(question(session, cards)!.truth));
    expect(session.queue).toEqual([]);
  });

  it("invalidates edited and deleted cards and restores the next committed format", () => {
    let session = startLearn(cards, "test");
    session = submit(session, cards, "Alpha");
    const restored = learnSchema.parse(JSON.parse(JSON.stringify(session)));
    expect(restored).toEqual(session);
    const edited = [{ ...cards[0]!, term: "Changed" }, cards[2]!];
    const next = reconcileLearn(restored, edited);
    expect(next.progress.map(item => item.id).sort()).toEqual(["0", "2"]);
    expect(next.progress.find(item => item.id === "0")!.seen).toBe(false);
  });

  it("loads old libraries and persists Learn alongside them", () => {
    const old = emptyAppState();
    expect(persistedAppStateSchema.parse(old).learnSession).toBeUndefined();
    const session = startLearn(cards, "test");
    expect(persistedAppStateSchema.parse({ ...old, learnSession: session }).learnSession).toEqual(session);
  });

  it("migrates legacy multiple-choice selections and preserves attempt history", () => {
    const old = { ...startLearn(cards, "test"), types: ["flashcard", "multipleChoice", "written"], attempts: [{
      id: "old-attempt", cardId: "0", type: "multipleChoice", answer: "Alpha", correct: true,
      hinted: false, override: false, at: "2026-01-01",
    }] };
    const migrated = persistedAppStateSchema.parse({ ...emptyAppState(), learnSession: old }).learnSession!;
    expect(migrated.types).toEqual(["flashcard", "written"]);
    expect(migrated.attempts).toEqual(old.attempts);
    expect(question(migrated, cards)?.type).toBe("written");
  });

  it("converts a completed choice-only session to typing without awarding recall mastery", () => {
    const old = startLearn(cards.slice(0, 1), "test");
    old.progress[0] = { ...old.progress[0]!, recognition: 2, mastered: true };
    const restored = learnSchema.parse({ ...old, types: ["multipleChoice"], queue: [] });
    expect(restored.types).toEqual(["written"]);
    expect(restored.queue).toEqual(["0"]);
    expect(restored.progress[0]!.mastered).toBe(false);
    expect(restored.progress[0]!.recognition).toBe(2);
    expect(question(restored, cards)?.type).toBe("written");
  });

  it("records an override once and never credits corrective retyping", () => {
    let session = startLearn(cards.slice(0, 1), "test");
    session.types = ["written"];
    session = submit(session, cards, "alternate", false, true);
    expect(session.attempts).toHaveLength(1);
    expect(session.attempts[0]!.override).toBe(true);
    expect(session.progress[0]!.recall).toBe(1);
  });
});
