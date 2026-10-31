import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleGenerate } from "./generate.ts";
import { resetRateLimit } from "./rateLimit.ts";

beforeEach(resetRateLimit);
const request = (body: unknown) => new Request("http://localhost/api/generate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const model = (output: unknown, finish_reason = "stop") => vi.fn(async () => Response.json({
  choices: [{ finish_reason, message: { content: JSON.stringify(output) } }],
}));
const env = { LLM_API_KEY: "test-server-key" };
const concept = { term: "CPU", scope: "computing", aliases: [], evidence: "CPU runs instructions." };

describe("generation operations", () => {
  it("accepts zero-concept sections but rejects fabricated source evidence", async () => {
    const input = { operation: "extractConcepts", content: "CPU runs instructions." };
    expect((await handleGenerate(request(input), { env, fetch: model({ concepts: [] }) })).status).toBe(200);
    expect((await handleGenerate(request(input), { env, fetch: model({ concepts: [concept] }) })).status).toBe(200);
    expect((await handleGenerate(request(input), { env, fetch: model({ concepts: [{ ...concept, evidence: "invented" }] }) })).status).toBe(502);
  });
  it("rejects overflowing requests before invoking the provider", async () => {
    const fetch = model({});
    const response = await handleGenerate(request({ operation: "extractConcepts", content: "x".repeat(4001) }), { env, fetch });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires the requested term and a valid single blank", async () => {
    const input = { operation: "generateConcept", concept, preferFillBlank: true };
    const card = { term: "CPU", description: "Runs instructions.", acceptedAnswers: [],
      fillBlank: { prompt: "_____ runs instructions.", acceptedAnswers: ["CPU"] } };
    expect((await handleGenerate(request(input), { env, fetch: model({ cards: [card] }) })).status).toBe(200);
    expect((await handleGenerate(request(input), { env, fetch: model({ cards: [{ ...card, term: "GPU" }] }) })).status).toBe(502);
    expect((await handleGenerate(request(input), { env, fetch: model({ cards: [{ ...card, fillBlank: undefined }] }) })).status).toBe(502);
    expect((await handleGenerate(request(input), { env, fetch: model({ cards: [card] }, "length") })).status).toBe(502);
  });
});
