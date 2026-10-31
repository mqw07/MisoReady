import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkSource, generateFromConcepts, reconcileConcepts, type GenerationCheckpoint } from "./generationPipeline.ts";
import { CHUNK_CHARS } from "./generationContract.ts";

afterEach(() => vi.unstubAllGlobals());
const concept = (term: string, scope = "computing") => ({ term, scope, aliases: [], evidence: term });

describe("full-source generation", () => {
  it("covers a long Unicode source without exceeding a request budget or breaking surrogate pairs", () => {
    const source = "intro\n" + Array.from({ length: 8000 }, (_, i) => `😀漢字${i}\n`).join("") + "last concept";
    const chunks = chunkSource(source);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks[0]).toContain("intro");
    expect(chunks.at(-1)).toContain("last concept");
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_CHARS);
      expect(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(chunk)).toBe(false);
      expect(new TextEncoder().encode(JSON.stringify({ operation: "extractConcepts", content: chunk })).length).toBeLessThan(64 * 1024);
    }
    // Every source character belongs to at least one chunk, including boundaries.
    let cursor = 0;
    for (const chunk of chunks) {
      const start = source.indexOf(chunk, Math.max(0, cursor - CHUNK_CHARS));
      expect(start).toBeLessThanOrEqual(cursor);
      cursor = Math.max(cursor, start + chunk.length);
    }
    expect(cursor).toBe(source.length);
  });

  it("merges explicit synonyms within a meaning and retains different meanings", () => {
    expect(reconcileConcepts([[{ ...concept("CPU"), aliases: ["processor"] }],
      [concept("processor"), concept("CPU", "biology")]])).toHaveLength(2);
  });

  it("extracts the entire inventory before writing more than 20 cards, including the final section", async () => {
    const source = Array.from({ length: 35 }, (_, i) => `Concept ${i}: definition.\n`).join("") + "x".repeat(13000) + "Tail concept";
    const requests: string[] = [];
    const mock = vi.fn(async (_url: string, init: RequestInit) => {
      const input = JSON.parse(String(init.body));
      requests.push(input.operation);
      if (input.operation === "extractConcepts") {
        const terms = Array.from(String(input.content).matchAll(/Concept \d+|Tail concept/g), match => match[0]);
        return Response.json({ concepts: terms.map(term => concept(term)) });
      }
      return Response.json({ cards: [{ term: input.concept.term, description: "A supported definition.", acceptedAnswers: [],
        fillBlank: { prompt: "_____ is this concept.", acceptedAnswers: [input.concept.term] } }] });
    });
    vi.stubGlobal("fetch", mock);
    const cards = await generateFromConcepts(source, true);
    expect(cards).toHaveLength(36);
    expect(cards.at(-1)?.term).toBe("Tail concept");
    const firstGeneration = requests.indexOf("generateConcept");
    expect(requests.slice(firstGeneration)).not.toContain("extractConcepts");
  });

  it("reuses completed tasks on retry without duplicating drafts", async () => {
    const checkpoint: GenerationCheckpoint = { content: "one two", preferFillBlank: false,
      extracted: [[concept("one"), concept("two")]], cards: [{ term: "one", description: "First", acceptedAnswers: [] }] };
    const mock = vi.fn(async () => Response.json({ cards: [{ term: "two", description: "Second", acceptedAnswers: [] }] }));
    vi.stubGlobal("fetch", mock);
    expect(await generateFromConcepts("one two", false, { checkpoint })).toHaveLength(2);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(await generateFromConcepts("one two", false, { checkpoint })).toHaveLength(2);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("keeps actual partial results when a later request fails, then resumes", async () => {
    const checkpoint: GenerationCheckpoint = { content: "one two", preferFillBlank: false, extracted: [], cards: [] };
    let unavailable = true;
    const mock = vi.fn(async (_url: string, init: RequestInit) => {
      const input = JSON.parse(String(init.body));
      if (input.operation === "extractConcepts") return Response.json({ concepts: [concept("one"), concept("two")] });
      if (input.concept.term === "two" && unavailable) return Response.json({ error: "Not configured" }, { status: 503 });
      return Response.json({ cards: [{ term: input.concept.term, description: "Definition", acceptedAnswers: [] }] });
    });
    vi.stubGlobal("fetch", mock);
    await expect(generateFromConcepts("one two", false, { checkpoint })).rejects.toThrow("Not configured");
    expect(checkpoint.cards.map(card => card.term)).toEqual(["one"]);
    unavailable = false;
    expect((await generateFromConcepts("one two", false, { checkpoint })).map(card => card.term)).toEqual(["one", "two"]);
    expect(mock).toHaveBeenCalledTimes(4);
  });

  it("rejects invented evidence and aborts before sending a cancelled request", async () => {
    const mock = vi.fn(async () => Response.json({ concepts: [concept("invented")] }));
    vi.stubGlobal("fetch", mock);
    await expect(generateFromConcepts("actual source", true)).rejects.toThrow("unsupported evidence");
    mock.mockClear();
    await expect(generateFromConcepts("actual source", true, { signal: AbortSignal.abort() })).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
