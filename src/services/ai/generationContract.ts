import { z } from "zod";
import { generateResponseSchema } from "./contract.ts";

// These are per-call budgets, never limits on a source document or a job.
export const CHUNK_CHARS = 4000;
export const conceptSchema = z.object({
  term: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  evidence: z.string().trim().min(1).max(1500),
});
export type Concept = z.infer<typeof conceptSchema>;
export const extractionSchema = z.object({ concepts: z.array(conceptSchema).max(80) });
export const operationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("extractConcepts"), content: z.string().min(1).max(CHUNK_CHARS) }),
  z.object({ operation: z.literal("generateConcept"), concept: conceptSchema,
    preferFillBlank: z.boolean() }),
]);
export type GenerationOperation = z.infer<typeof operationSchema>;
export const conceptCardSchema = generateResponseSchema.refine(value => value.cards.length === 1,
  "Return exactly one card for the concept.");

export function validBlank(prompt: string): boolean {
  return (prompt.match(/_{5}/g) ?? []).length === 1 && !/_{6}/.test(prompt);
}

// The model selects an ID; the application copies evidence from the original
// text. Math glyphs, line breaks and spacing need not be retyped by the model.
export function sourcePassages(source: string): { id: string; text: string }[] {
  const passages: { id: string; text: string }[] = [];
  let start = 0;
  while (start < source.length) {
    let end = Math.min(start + 1000, source.length);
    if (end < source.length && /[\uD800-\uDBFF]/.test(source[end - 1]!)) end--;
    const text = source.slice(start, end).trim();
    if (text) passages.push({ id: `p${passages.length + 1}`, text });
    if (end === source.length) break;
    start = end - 150;
    if (/[\uDC00-\uDFFF]/.test(source[start]!)) start--;
  }
  return passages;
}

export function resolveExtractedConcepts(payload: unknown, source: string): { concepts: Concept[] } {
  const raw = z.object({ concepts: z.array(z.object({
    term: conceptSchema.shape.term,
    scope: conceptSchema.shape.scope,
    aliases: conceptSchema.shape.aliases,
    evidenceId: z.string().optional(),
    evidence: conceptSchema.shape.evidence.optional(),
  })).max(80) }).parse(payload);
  const passages = new Map(sourcePassages(source).map(passage => [passage.id, passage.text]));
  return extractionSchema.parse({ concepts: raw.concepts.map(concept => {
    const evidence = concept.evidenceId !== undefined ? passages.get(concept.evidenceId) : concept.evidence;
    if (!evidence || !source.includes(evidence)) throw new Error("Unsupported source reference");
    return { term: concept.term, scope: concept.scope, aliases: concept.aliases, evidence };
  }) });
}
