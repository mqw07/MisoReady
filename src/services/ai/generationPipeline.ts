import type { GeneratedCard } from "./contract.ts";
import { CHUNK_CHARS, conceptCardSchema, extractionSchema, validBlank, type Concept, type GenerationOperation } from "./generationContract.ts";

export interface GenerationCheckpoint {
  content: string;
  preferFillBlank: boolean;
  extracted: Concept[][];
  cards: GeneratedCard[];
}
export interface PipelineOptions {
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
  checkpoint?: GenerationCheckpoint;
}

export function chunkSource(source: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < source.length) {
    let end = Math.min(start + CHUNK_CHARS, source.length);
    if (end < source.length) {
      // Never divide a UTF-16 surrogate pair; preserve overlap for boundary context.
      if (/[\uD800-\uDBFF]/.test(source[end - 1]!)) end--;
      const boundary = source.lastIndexOf("\n", end - 1);
      if (boundary > start + CHUNK_CHARS / 2) end = boundary + 1;
    }
    chunks.push(source.slice(start, end));
    if (end === source.length) break;
    start = end - 200;
    if (/[\uDC00-\uDFFF]/.test(source[start]!)) start--;
  }
  return chunks;
}

const normalized = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");

export function reconcileConcepts(groups: Concept[][]): Concept[] {
  const concepts: Concept[] = [];
  const index = new Map<string, number>();
  for (const candidate of groups.flat()) {
    const keys = [candidate.term, ...candidate.aliases].map(term => `${normalized(candidate.scope)}\0${normalized(term)}`);
    const matched = keys.map(key => index.get(key)).find(value => value !== undefined);
    if (matched !== undefined) {
      const existing = concepts[matched]!;
      existing.aliases = [...new Set([...existing.aliases, candidate.term, ...candidate.aliases])].filter(term => term !== existing.term).slice(0, 20);
      keys.forEach(key => index.set(key, matched));
    } else {
      const position = concepts.push({ ...candidate, aliases: [...candidate.aliases] }) - 1;
      keys.forEach(key => index.set(key, position));
    }
  }
  return concepts;
}

async function operation(input: GenerationOperation, signal?: AbortSignal): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), signal });
    if (response.ok) return response.json();
    const payload: unknown = await response.json().catch(() => null);
    if (attempt >= 2 || (response.status !== 429 && response.status < 500) || response.status === 503) {
      throw new Error((payload as { error?: string } | null)?.error || "Generation failed. Retry to continue.");
    }
    const seconds = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt;
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(signal?.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, delay);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  }
}

export async function generateFromConcepts(content: string, preferFillBlank: boolean, options: PipelineOptions = {}): Promise<GeneratedCard[]> {
  const job = options.checkpoint ?? { content, preferFillBlank, extracted: [], cards: [] };
  if (job.content !== content || job.preferFillBlank !== preferFillBlank) throw new Error("Source changed. Start a new generation.");
  const chunks = chunkSource(content);
  for (let i = job.extracted.length; i < chunks.length; i++) {
    options.onProgress?.(`Identifying concepts: section ${i + 1} of ${chunks.length}`);
    const result = extractionSchema.parse(await operation({ operation: "extractConcepts", content: chunks[i]! }, options.signal));
    if (result.concepts.some(concept => !chunks[i]!.includes(concept.evidence))) throw new Error("The AI supplied unsupported evidence. Retry this section.");
    job.extracted.push(result.concepts);
  }
  const concepts = reconcileConcepts(job.extracted);
  if (!concepts.length) throw new Error("No study concepts found in these notes. Try another source.");
  for (let i = job.cards.length; i < concepts.length; i++) {
    options.onProgress?.(`Writing cards: ${i + 1} of ${concepts.length} concepts`);
    const result = conceptCardSchema.parse(await operation({ operation: "generateConcept", concept: concepts[i]!, preferFillBlank }, options.signal));
    const card = result.cards[0]!;
    if (card.term !== concepts[i]!.term || (preferFillBlank && (!card.fillBlank ||
      !validBlank(card.fillBlank.prompt) || !card.fillBlank.acceptedAnswers.includes(card.term)))) {
      throw new Error("The AI returned an invalid concept card. Retry to continue.");
    }
    job.cards.push(card);
  }
  return job.cards;
}
