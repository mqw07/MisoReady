import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGenerate } from "./generate.ts";
import { resetRateLimit } from "./rateLimit.ts";

afterEach(() => {
  resetRateLimit();
});

const notes = "fork creates a child process by duplicating the caller.";

function generateRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://127.0.0.1/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  content: notes,
  courseId: "course-1",
  unitId: "unit-1",
  numberOfCards: 2,
};

function llmFetch(content: unknown, status = 200) {
  return vi.fn(async () =>
    Response.json(
      {
        choices: [{ message: { content } }],
      },
      { status },
    ),
  );
}

describe("POST /api/generate", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleGenerate(new Request("http://127.0.0.1/api/generate"));
    expect(response.status).toBe(405);
  });

  it("rejects invalid JSON and oversized card counts", async () => {
    const invalid = await handleGenerate(
      new Request("http://127.0.0.1/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );
    expect(invalid.status).toBe(400);

    const count = await handleGenerate(generateRequest({ ...validBody, numberOfCards: 99 }));
    expect(count.status).toBe(400);
    await expect(count.json()).resolves.toEqual({ error: "Ask for between 1 and 20 cards." });
  });

  it("returns 503 when the server key is missing", async () => {
    const response = await handleGenerate(generateRequest(validBody), {
      env: {},
      fetch: llmFetch("{}"),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Card generation is not configured on the server.",
    });
  });

  it("returns drafts from structured model JSON and ignores a client-supplied key", async () => {
    const fetchMock = llmFetch(
      JSON.stringify({
        cards: [
          {
            term: "fork()",
            description: "Creates a new process.",
            acceptedAnswers: ["fork"],
            fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
          },
        ],
      }),
    );
    const response = await handleGenerate(
      generateRequest({ ...validBody, apiKey: "stolen-client-key" }),
      { env: { LLM_API_KEY: "server-key" }, fetch: fetchMock },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cards: [
        {
          term: "fork()",
          description: "Creates a new process.",
          acceptedAnswers: ["fork"],
          fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer server-key");
    expect(headers.get("authorization")).not.toContain("stolen");
    const sent = JSON.parse(String(init.body)) as { messages: { content: string }[] };
    expect(sent.messages[1]?.content).toContain(notes);
    expect(JSON.stringify(init.headers)).not.toContain("stolen-client-key");
  });

  it("returns 502 for malformed model output and does not log note bodies", async () => {
    const logged: string[] = [];
    const spies = ["log", "info", "warn", "error", "debug"].map((method) =>
      vi.spyOn(console, method as "log").mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      }),
    );
    const response = await handleGenerate(generateRequest(validBody), {
      env: { LLM_API_KEY: "server-key" },
      fetch: llmFetch("not-json"),
    });
    expect(response.status).toBe(502);
    expect(logged.join("\n")).not.toContain(notes);
    spies.forEach((spy) => spy.mockRestore());
  });

  it("keeps usable drafts when the model uses messy JSON", async () => {
    const fetchMock = llmFetch([
      {
        type: "text",
        text: 'Sure.\n```json\n{"flashcards":[{"question":"Creates a new process.","answer":"fork()","acceptedAnswers":"fork"}]}\n```',
      },
    ]);
    const response = await handleGenerate(generateRequest(validBody), {
      env: { LLM_API_KEY: "server-key" },
      fetch: fetchMock,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cards: [{ term: "fork()", description: "Creates a new process.", acceptedAnswers: ["fork"] }],
    });
  });

  it("asks for fill-in-the-blank drafts and synthesizes a prompt when omitted", async () => {
    const fetchMock = llmFetch(
      JSON.stringify({
        cards: [{ term: "pipe", description: "Connects processes.", acceptedAnswers: [] }],
      }),
    );
    const response = await handleGenerate(
      generateRequest({ ...validBody, preferFillBlank: true }),
      { env: { LLM_API_KEY: "server-key" }, fetch: fetchMock },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cards: [
        {
          term: "pipe",
          description: "Connects processes.",
          acceptedAnswers: [],
          fillBlank: { prompt: "_____ — Connects processes.", acceptedAnswers: ["pipe"] },
        },
      ],
    });
    const [, init] = fetchMock.mock.calls[0]!;
    const sent = JSON.parse(String(init.body)) as { messages: { content: string }[] };
    expect(sent.messages[0]?.content).toContain("Every card MUST include fillBlank");
    expect(sent.messages[1]?.content).toContain("fill-in-the-blank flashcards");
  });

  it("rate-limits repeated requests from the same client", async () => {
    const env = { LLM_API_KEY: "server-key" };
    const fetchImpl = llmFetch(JSON.stringify({ cards: [{ term: "x", description: "y" }] }));
    const headers = { "x-forwarded-for": "203.0.113.8" };
    let last: Response | undefined;
    for (let i = 0; i < 9; i += 1) {
      last = await handleGenerate(generateRequest(validBody, headers), {
        env,
        fetch: fetchImpl,
        now: 1_000,
      });
    }
    expect(last?.status).toBe(429);
  });
});
