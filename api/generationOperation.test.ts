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
  it("resolves mathematical evidence by source ID without requiring the model to retype it", async () => {
    const content = "Continuous RV: P(X = x) = 0. Density fₓ(x) ≥ 0; ∫ fₓ(x) dx = 1.\nFₓ(t) = P(X ≤ t).";
    const fetch = model({ concepts: [{ term: "Probability density function", scope: "continuous random variables", evidenceId: "p1" }] });
    const response = await handleGenerate(request({ operation: "extractConcepts", content }), { env, fetch });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ concepts: [{ term: "Probability density function",
      scope: "continuous random variables", aliases: [], evidence: content }] });
    const sent = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(JSON.parse(sent.messages[1].content).passages).toEqual([{ id: "p1", text: content }]);
  });
  it("rejects unknown passage IDs and reports the failed stage without source content", async () => {
    const response = await handleGenerate(request({ operation: "extractConcepts", content: "PRIVATE NOTES" }), {
      env, fetch: model({ concepts: [{ term: "X", scope: "math", aliases: [], evidenceId: "p999" }] }),
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toMatchObject({ code: "INVALID_CONCEPTS", stage: "extractConcepts" });
    expect(JSON.stringify(body)).not.toContain("PRIVATE NOTES");
  });
  it("accepts missing optional aliases and a different underscore width while preserving the concept", async () => {
    const response = await handleGenerate(request({ operation: "generateConcept", concept, preferFillBlank: true }), {
      env, fetch: model({ cards: [{ term: "CPU", definition: "Runs instructions.",
        fillBlank: { prompt: "___ runs instructions.", acceptedAnswers: ["CPU"] } }] }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).cards[0]).toMatchObject({ term: "CPU", description: "Runs instructions.",
      acceptedAnswers: [], fillBlank: { prompt: "_____ runs instructions." } });
  });
  it("distinguishes truncated output from refused content", async () => {
    const input = { operation: "extractConcepts", content: "continuous random variables" };
    const truncated = await handleGenerate(request(input), { env, fetch: model({}, "length") });
    expect(truncated.status).toBe(502);
    expect(await truncated.json()).toMatchObject({ code: "OUTPUT_TRUNCATED" });
    const refused = await handleGenerate(request(input), { env, fetch: model({}, "content_filter") });
    expect(refused.status).toBe(422);
    expect(await refused.json()).toMatchObject({ code: "PROVIDER_REFUSAL" });
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
