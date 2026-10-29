import { createEmptyCard, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("domain libraries", () => {
  it("validates with zod and builds an initial FSRS card", () => {
    const parsed = z.object({ name: z.string() }).parse({ name: "Miso" });
    expect(parsed.name).toBe("Miso");

    const card = createEmptyCard(new Date("2026-10-29T14:00:00Z"));
    expect(card.due).toBeInstanceOf(Date);
    expect(card.state).toBe(State.New);
  });
});
