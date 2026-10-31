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
  it("accepts missing optional aliases and derives a blank for the concept", async () => {
    const response = await handleGenerate(request({ operation: "generateConcept", concept, preferFillBlank: true }), {
      env, fetch: model({ cards: [{ term: "CPU", definition: "Runs instructions.",
        fillBlank: { prompt: "___ runs instructions.", acceptedAnswers: ["CPU"] } }] }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).cards[0]).toMatchObject({ term: "CPU", description: "Runs instructions.",
      acceptedAnswers: [], fillBlank: { prompt: "_____ — Runs instructions." } });
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
    const derived = await handleGenerate(request(input), { env, fetch: model({ cards: [{ ...card, fillBlank: undefined }] }) });
    expect(derived.status).toBe(200);
    expect((await derived.json()).cards[0].fillBlank).toEqual({ prompt: "_____ — Runs instructions.", acceptedAnswers: ["CPU"] });
    expect((await handleGenerate(request(input), { env, fetch: model({ cards: [card] }, "length") })).status).toBe(502);
  });
  it("owns identity and answers when the provider returns only a definition and cloze", async () => {
    const response = await handleGenerate(request({ operation: "generateConcept", concept, preferFillBlank: true }), {
      env, fetch: model({ definition: "The CPU runs instructions.", termSentence: "The CPU runs instructions." }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).cards[0]).toEqual({ term: "CPU", description: "The CPU runs instructions.",
      acceptedAnswers: [], fillBlank: { prompt: "The _____ runs instructions.", acceptedAnswers: ["CPU"] } });
  });
  it("normalizes term casing and rebuilds a malformed blank from the validated definition", async () => {
    const response = await handleGenerate(request({ operation: "generateConcept", concept, preferFillBlank: true }), {
      env, fetch: model({ cards: [{ term: "cpu", description: "The CPU runs instructions.",
        fillBlank: { prompt: "No blank here", acceptedAnswers: ["cpu"] } }] }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).cards[0]).toMatchObject({ term: "CPU",
      fillBlank: { prompt: "The _____ runs instructions.", acceptedAnswers: ["CPU"] } });
  });
  it("identifies missing definitions and wrong concepts without returning note content", async () => {
    const input = { operation: "generateConcept", concept, preferFillBlank: true };
    const missing = await handleGenerate(request(input), { env, fetch: model({ cloze: "[ANSWER] runs instructions." }) });
    expect(missing.status).toBe(502);
    expect(await missing.json()).toMatchObject({ reason: "MISSING_OR_OVERSIZED_DEFINITION" });
    const wrong = await handleGenerate(request(input), { env, fetch: model({ cards: [{ term: "GPU", description: "Different concept." }] }) });
    expect(await wrong.json()).toMatchObject({ reason: "WRONG_CONCEPT" });
  });
  it("does not pair a model-selected numeric blank with the concept answer", async () => {
    const probability = { term: "Uniform distribution", scope: "probability", aliases: [], evidence: "The density is constant on an interval." };
    const response = await handleGenerate(request({ operation: "generateConcept", concept: probability, preferFillBlank: true }), {
      env, fetch: model({ definition: "A uniform distribution has constant density on an interval.",
        cloze: "The constant density is [ANSWER]." }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).cards[0].fillBlank).toEqual({
      prompt: "A _____ has constant density on an interval.", acceptedAnswers: ["Uniform distribution"],
    });
  });
});
