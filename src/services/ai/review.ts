import { z } from "zod";

export const reviewRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  context: z.string().trim().min(1).max(8000),
  expected: z.string().trim().min(1).max(2000),
  aliases: z.array(z.string().max(2000)).max(30),
  answer: z.string().trim().min(1).max(4000),
});
export const reviewVerdictSchema = z.object({
  correct: z.boolean(),
  explanation: z.string().trim().min(1).max(2000),
});
export type ReviewVerdict = z.infer<typeof reviewVerdictSchema>;
export type ReviewInput = z.infer<typeof reviewRequestSchema>;

export async function reviewAnswer(input: ReviewInput, signal: AbortSignal): Promise<ReviewVerdict> {
  let response: Response;
  try {
    response = await fetch("/api/review-answer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), signal,
    });
  } catch {
    throw new Error("AI review could not connect or timed out. Retry or choose a rating to continue.");
  }
  if (!response.ok) {
    throw new Error(response.status === 429 ? "Too many AI checks. Try again later." : "AI review is unavailable. Retry or choose a rating to continue.");
  }
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new Error("AI returned an unusable review. Retry or continue with your rating."); }
  const parsed = reviewVerdictSchema.safeParse(payload);
  if (!parsed.success) throw new Error("AI returned an unusable review. Retry or continue with your rating.");
  return parsed.data;
}
