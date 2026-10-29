import type { IncomingMessage, ServerResponse } from "node:http";
import {
  applyFillBlankPreference,
  extractJsonPayload,
  MAX_BODY_BYTES,
  parseGenerateRequest,
  parseGenerateResponse,
  readModelText,
} from "../src/services/ai/contract.ts";
import { allowRequest, clientKey } from "./rateLimit.ts";

function systemPrompt(preferFillBlank: boolean): string {
  const fillBlankRule = preferFillBlank
    ? "Every card MUST include fillBlank with a prompt that uses a single _____ blank and acceptedAnswers that include the term. The blank must test the same knowledge as the card."
    : "fillBlank is optional: { prompt with one blank, acceptedAnswers }.";
  return [
    "You create study flashcards as JSON.",
    'Return only {"cards":[...]} with no markdown.',
    "Each card needs:",
    "- term: the short answer the student should recall",
    "- description: the prompt or definition shown first",
    "- acceptedAnswers: optional extra typed answers, not including the term",
    `- ${fillBlankRule}`,
    "Stay faithful to the notes. Do not invent facts. If the notes cannot support the requested count, return fewer valid cards.",
  ].join(" ");
}

export interface GenerateEnv {
  LLM_API_KEY?: string;
  LLM_API_URL?: string;
  LLM_MODEL?: string;
}

export interface GenerateHandlerOptions {
  env?: GenerateEnv;
  fetch?: typeof fetch;
  now?: number;
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function readEnv(options?: GenerateHandlerOptions): GenerateEnv {
  return options?.env ?? process.env;
}

async function completeChat(
  input: { content: string; numberOfCards: number; preferFillBlank: boolean },
  env: GenerateEnv,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<{ text: string } | { error: Response }> {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return { error: jsonError("Card generation is not configured on the server.", 503) };
  }

  const baseUrl = (env.LLM_API_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(input.preferFillBlank) },
        {
          role: "user",
          content: input.preferFillBlank
            ? `Create ${String(input.numberOfCards)} fill-in-the-blank flashcards from these notes:\n\n${input.content}`
            : `Create ${String(input.numberOfCards)} flashcards from these notes:\n\n${input.content}`,
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    return { error: jsonError("Generation failed. Try again in a moment.", 502) };
  }

  const payload: unknown = await response.json();
  const content = readModelText(payload);
  if (!content) {
    return { error: jsonError("The model returned unusable drafts.", 502) };
  }
  return { text: content };
}

export async function handleGenerate(
  request: Request,
  options: GenerateHandlerOptions = {},
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    return jsonError("Those notes are too large to send.", 413);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Send JSON.", 415);
  }

  const raw = await request.text();
  if (utf8Bytes(raw) > MAX_BODY_BYTES) {
    return jsonError("Those notes are too large to send.", 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return jsonError("Send JSON.", 400);
  }

  const parsed = parseGenerateRequest(payload);
  if ("error" in parsed) return jsonError(parsed.error, 400);

  const env = readEnv(options);
  if (!env.LLM_API_KEY?.trim()) {
    return jsonError("Card generation is not configured on the server.", 503);
  }

  const now = options.now ?? Date.now();
  if (!allowRequest(clientKey(request), now)) {
    return jsonError("Too many generation requests. Try again in a few minutes.", 429);
  }

  try {
    const preferFillBlank = parsed.value.preferFillBlank === true;
    const completion = await completeChat(
      {
        content: parsed.value.content,
        numberOfCards: parsed.value.numberOfCards,
        preferFillBlank,
      },
      env,
      options.fetch ?? globalThis.fetch,
      AbortSignal.timeout(45_000),
    );
    if ("error" in completion) return completion.error;

    let modelPayload: unknown;
    try {
      modelPayload = extractJsonPayload(completion.text);
    } catch {
      return jsonError("The model returned unusable drafts.", 502);
    }

    const drafts = parseGenerateResponse(modelPayload);
    if ("error" in drafts) return jsonError(drafts.error, 502);
    return Response.json({
      cards: applyFillBlankPreference(drafts.cards, preferFillBlank).slice(0, parsed.value.numberOfCards),
    });
  } catch {
    return jsonError("Generation failed. Try again in a moment.", 502);
  }
}

function nodeHeaders(headers: IncomingMessage["headers"]): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") result.set(key, value);
    else if (Array.isArray(value)) result.set(key, value.join(", "));
  }
  return result;
}

/** Vercel's Node runtime passes IncomingMessage, whose headers have no `.get`. */
export async function handleNodeGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const method = req.method ?? "GET";
    const request = new Request("http://127.0.0.1/api/generate", {
      method,
      headers: nodeHeaders(req.headers),
      body: method === "GET" || method === "HEAD" ? undefined : body,
    });
    const response = await handleGenerate(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (res.writableEnded) return;
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Generation failed. Try again in a moment." }));
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleNodeGenerate(req, res);
}
