import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGeneratedCards } from "./client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = {
  content: "fork creates a child process",
  courseId: "course-1",
  unitId: "unit-1",
  numberOfCards: 5,
};

describe("AI generation client", () => {
  it("returns drafts from a successful JSON response", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        cards: [{ term: "fork()", description: "Creates a new process.", acceptedAnswers: ["fork"] }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestGeneratedCards(request)).resolves.toEqual({
      ok: true,
      cards: [{ term: "fork()", description: "Creates a new process.", acceptedAnswers: ["fork"] }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  });

  it("surfaces server errors without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Card generation is not configured on the server." }, { status: 503 }),
      ),
    );
    await expect(requestGeneratedCards(request)).resolves.toEqual({
      ok: false,
      error: "Card generation is not configured on the server.",
    });
  });

  it("keeps a readable message when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(requestGeneratedCards(request)).resolves.toEqual({
      ok: false,
      error: "Could not reach the generation service. Your notes are still here.",
    });
  });
});
