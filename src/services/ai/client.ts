import { generateFromConcepts, type PipelineOptions } from "./generationPipeline.ts";
import {
  generateErrorSchema,
  parseGenerateResponse,
  type GenerateRequest,
  type GeneratedCard,
} from "./contract.ts";

export type GenerateClientResult =
  | { ok: true; cards: GeneratedCard[] }
  | { ok: false; error: string };

const FALLBACK_ERROR = "Generation failed. Try again in a moment.";
const NETWORK_ERROR = "Could not reach the generation service. Your notes are still here.";

function fallbackError(status: number): string {
  if (status === 503) return "Card generation is not configured on the server.";
  if (status === 429) return "Too many generation requests. Try again in a few minutes.";
  if (status === 413) return "Those notes are too large to send.";
  return FALLBACK_ERROR;
}

export async function requestGeneratedCards(
  input: GenerateRequest | Omit<GenerateRequest, "numberOfCards">,
  options: PipelineOptions = {},
): Promise<GenerateClientResult> {
  if (!("numberOfCards" in input)) {
    try {
      return { ok: true, cards: await generateFromConcepts(input.content, input.preferFillBlank === true, options) };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      return { ok: false, error: error instanceof Error ? error.message : FALLBACK_ERROR };
    }
  }
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, error: NETWORK_ERROR };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: fallbackError(response.status) };
  }

  if (!response.ok) {
    const parsed = generateErrorSchema.safeParse(payload);
    return { ok: false, error: parsed.success ? parsed.data.error : fallbackError(response.status) };
  }

  const parsed = parseGenerateResponse(payload);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  return { ok: true, cards: parsed.cards };
}
