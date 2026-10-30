import { describe, expect, it } from "vitest";
import { emptyAppState } from "../../repositories/schema.ts";
import { createAppDocumentRepository } from "../../repositories/appDocument.ts";
import { createMemoryStorage } from "../../repositories/storage.ts";
import { insertCard, insertCourse, insertUnit, recordReview } from "../library/mutations.ts";
import { applyAiReview, createStudyEngine, displayedRecallCorrect, gradeCard, rateCard } from "./engine.ts";

function seed() {
  let state = insertCourse(emptyAppState(), "Probability").state;
  state = insertUnit(state, state.courses[0]!.id, "Random variables")!.state;
  return insertCard(state, state.units[0]!.id, { term: "Bernouli RV", description: "Name the random variable describing one binary trial.", acceptedAnswers: [], fillBlank: { prompt: "_____ describes a single binary trial.", acceptedAnswers: ["Bernouli RV"] } })!.state;
}
describe("AI appeal grading", () => {
  for (const mode of ["typed", "fillBlank"]) {
    it(`remarks ${mode} answers and saves the verdict with one review`, () => {
      const state = seed();
      const graded = gradeCard(createStudyEngine(state.cards, new URLSearchParams(`mode=${mode}`)), "Bernouli");
      expect(graded.match?.correct).toBe(false);
      expect(rateCard({ ...graded, aiPending: true }, "good").attempt).toBeNull();
      const verdict = { correct: true, explanation: "The answer names the required distribution; RV is redundant here." };
      const accepted = applyAiReview(graded, verdict);
      expect(displayedRecallCorrect(accepted)).toBe(1);
      const result = rateCard(accepted, "good");
      expect(result.attempt?.correct).toBe(true);
      expect(result.engine.recallCorrect).toBe(1);
      expect(result.engine.aiReview).toBeUndefined();
      const saved = recordReview(state, { ...result.attempt!, reschedule: true })!.state;
      const repository = createAppDocumentRepository(createMemoryStorage());
      repository.load();
      repository.save(saved);
      expect(repository.load().state.reviews[0]).toMatchObject({ correct: true, aiReview: verdict });
      expect(saved.reviews[0]!.pointsEarned).toBeGreaterThan(0);
      expect(rateCard(result.engine, "good").attempt).toBeNull();
    });
  }
  it("keeps wrong answers incorrect and never downgrades a local correct answer", () => {
    const state = seed();
    const engine = createStudyEngine(state.cards, new URLSearchParams("mode=typed"));
    const verdict = { correct: false, explanation: "This answer describes another concept." };
    expect(applyAiReview(gradeCard(engine, "Gaussian"), verdict).match?.correct).toBe(false);
    expect(applyAiReview(gradeCard(engine, "Bernouli RV"), verdict).match?.correct).toBe(true);
  });
});
