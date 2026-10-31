import { z } from "zod";
import { generateResponseSchema } from "./contract.ts";

// These are per-call budgets, never limits on a source document or a job.
export const CHUNK_CHARS = 4000;
export const conceptSchema = z.object({
  term: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1).max(200)).max(20),
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
