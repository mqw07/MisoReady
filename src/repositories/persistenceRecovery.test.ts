import { describe, expect, it } from "vitest";
import { createAppDocumentRepository } from "./appDocument.ts";
import { createMemoryStorage, APP_STATE_STORAGE_KEY } from "./storage.ts";
import { emptyAppState } from "./schema.ts";
import { insertCourse, insertUnit, insertCard, recordReview } from "../features/library/mutations.ts";
import { createStudyEngine, restoreStudyEngine, rateCard } from "../features/study/engine.ts";

const now = new Date("2026-10-29T16:00:00Z");
function seed() {
  let state = insertCourse(emptyAppState(), "Course", { id: "c", now }).state;
  state = insertUnit(state, "c", "Unit", { id: "u", now })!.state;
  for (const id of ["a", "b"]) state = insertCard(state, "u", { term: id, description: id, acceptedAnswers: [] }, { id, now })!.state;
  return state;
}

describe("persistence recovery", () => {
  it("rejects stale-tab writes instead of erasing reviews", () => {
    const storage = createMemoryStorage();
    const first = createAppDocumentRepository(storage);
    first.load();
    const state = seed();
    first.save(state);
    const other = createAppDocumentRepository(storage);
    other.load();
    const reviewed = recordReview(state, { cardId: "a", rating: "good", mode: "reveal", reschedule: true }, { id: "r", now })!.state;
    expect(first.save(reviewed).status).toBe("ok");
    expect(other.save(state).status).toBe("error");
    expect(first.load().state.reviews).toHaveLength(1);
  });

  it("retries a quota failure without advancing the saved baseline or duplicating reviews", () => {
    const memory = createMemoryStorage();
    let fail = false;
    const repository = createAppDocumentRepository({ getItem: memory.getItem, setItem(key, value) {
      if (fail) throw new Error("Quota exceeded");
      memory.setItem(key, value);
    } });
    repository.load();
    const state = seed();
    repository.save(state);
    const raw = memory.getItem(APP_STATE_STORAGE_KEY);
    const next = recordReview(state, { cardId: "a", rating: "good", mode: "typed", reschedule: true }, { id: "r", now })!.state;
    fail = true;
    expect(repository.save(next).status).toBe("error");
    expect(memory.getItem(APP_STATE_STORAGE_KEY)).toBe(raw);
    fail = false;
    expect(repository.save(next).status).toBe("ok");
    expect(repository.load().state.reviews.map((review) => review.id)).toEqual(["r"]);
  });

  for (const scope of ["all", "due"]) {
    it(`resumes partial and completed ${scope} sessions with schedules and history intact`, () => {
      const repository = createAppDocumentRepository(createMemoryStorage());
      repository.load();
      let state = seed();
      const search = new URLSearchParams(`scope=${scope}`);
      const engine = createStudyEngine(state.cards, search, now);
      state = recordReview(state, { cardId: "a", rating: "good", mode: "reveal", reschedule: scope === "due", session: { key: engine.key, cardIds: ["a", "b"], reviewIds: [] } }, { id: "r1", now })!.state;
      repository.save(state);
      state = repository.load().state;
      const resumed = restoreStudyEngine(state, search);
      expect(resumed.index).toBe(1);
      expect(resumed.phase).toBe("front");
      expect(resumed.ratings).toEqual(["good"]);
      expect(state.cards[0]!.fsrs.reps).toBe(scope === "due" ? 1 : 0);
      state = recordReview(state, { cardId: "b", rating: "easy", mode: "reveal", reschedule: scope === "due", session: { key: engine.key, cardIds: ["a", "b"], reviewIds: ["r1"] } }, { id: "r2", now })!.state;
      repository.save(state);
      const done = restoreStudyEngine(repository.load().state, search);
      expect(done.phase).toBe("done");
      expect(done.ratings).toEqual(["good", "easy"]);
      expect(rateCard(done, "good").attempt).toBeNull();
      expect(restoreStudyEngine({ ...state, studySession: undefined }, search).reviewIds).toEqual([]);
      expect(restoreStudyEngine({ ...state, cards: [] }, search).phase).toBe("empty");
      expect(restoreStudyEngine({ ...state, reviews: [] }, search).reviewIds).toEqual([]);
    });
  }
});
