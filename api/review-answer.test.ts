import { afterEach, describe, expect, it, vi } from "vitest";
import { handleReviewAnswer } from "./review-answer.ts";
import { resetRateLimit } from "./rateLimit.ts";

afterEach(resetRateLimit);
const input = { prompt: "Name the RV modeling a single trial with success or failure.", context: "Bernouli RV models a single binary trial.", expected: "Bernouli RV", aliases: [], answer: "Bernouli" };
const request = (body: unknown = input) => new Request("http://localhost/api/review-answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const env = { LLM_API_KEY: "test-server-key", LLM_API_URL: "https://example.test/v1", LLM_MODEL: "test-model" };
const model = (content: unknown) => vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] }));

describe("answer review API", () => {
  it("returns a validated contextual acceptance and supplies the actual question to the model", async () => {
    const upstream = model({ correct: true, explanation: "RV is redundant because the question already asks for a random variable." });
    const response = await handleReviewAnswer(request({ ...input, apiKey: "ignored" }), { env, fetch: upstream });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ correct: true });
    const call = upstream.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[1].headers).toMatchObject({ Authorization: "Bearer test-server-key" });
    const body = JSON.parse(call[1].body as string);
    expect(JSON.parse(body.messages[1].content)).toEqual(input);
    expect(body.messages[0].content).toContain("missing essential distinctions");
  });
  it("returns an explanation for a materially wrong answer", async () => {
    const response = await handleReviewAnswer(request({ ...input, answer: "Gaussian" }), { env, fetch: model({ correct: false, explanation: "Gaussian is continuous; this question asks about a binary trial." }) });
    expect(await response.json()).toMatchObject({ correct: false, explanation: expect.stringContaining("binary") });
  });
  it("rejects blank answers, oversized input, wrong methods, and missing server configuration", async () => {
    expect((await handleReviewAnswer(request({ ...input, answer: " " }), { env })).status).toBe(400);
    expect((await handleReviewAnswer(request({ ...input, context: "x".repeat(33000) }), { env })).status).toBe(413);
    expect((await handleReviewAnswer(new Request("http://localhost/api/review-answer"))).status).toBe(405);
    expect((await handleReviewAnswer(request(), { env: {} })).status).toBe(503);
  });
  it("rejects malformed verdicts and upstream failures without leaking server details", async () => {
    for (const verdict of [{ correct: "true", explanation: "Looks right" }, { correct: true, explanation: "" }]) {
      expect((await handleReviewAnswer(request(), { env, fetch: model(verdict) })).status).toBe(502);
    }
    const response = await handleReviewAnswer(request(), { env, fetch: vi.fn().mockRejectedValue(new Error("private-key-detail")) });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private-key-detail");
  });
  it("rate limits reviews separately from generation", async () => {
    const upstream = model({ correct: true, explanation: "Equivalent." });
    for (let i = 0; i < 40; i++) expect((await handleReviewAnswer(request(), { env, fetch: upstream, now: 1000 })).status).toBe(200);
    expect((await handleReviewAnswer(request(), { env, fetch: upstream, now: 1000 })).status).toBe(429);
    expect(upstream).toHaveBeenCalledTimes(40);
  });
});
