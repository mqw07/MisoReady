import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { createInitialFsrsState } from "./fsrsCard.ts";
import { applyRating } from "./review.ts";

const now = new Date("2026-10-29T16:00:00.000Z");

describe("applyRating", () => {
  it("schedules a new card later after Good", () => {
    const initial = createInitialFsrsState(now);
    expect(initial.state).toBe(State.New);
    const next = applyRating(initial, "good", now);
    expect(Date.parse(next.due)).toBeGreaterThan(now.getTime());
    expect(next.last_review).toBe(now.toISOString());
    expect(next.reps).toBeGreaterThan(0);
  });

  it("keeps Again due soon relative to Easy", () => {
    const initial = createInitialFsrsState(now);
    const again = applyRating(initial, "again", now);
    const easy = applyRating(initial, "easy", now);
    expect(Date.parse(again.due)).toBeLessThan(Date.parse(easy.due));
  });
});
