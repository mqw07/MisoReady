import { describe, expect, it } from "vitest";
import {
  applyFillBlankPreference,
  ensureFillBlank,
  extractJsonPayload,
  MAX_SOURCE_CHARS,
  parseGenerateRequest,
  parseGenerateResponse,
  readModelText,
  sanitizeGeneratedCard,
} from "./contract.ts";

describe("AI generation contract", () => {
  it("accepts a bounded request and rejects oversized notes or counts", () => {
    const valid = parseGenerateRequest({
      content: "fork creates a child process",
      courseId: "course-1",
      unitId: "unit-1",
      numberOfCards: 10,
    });
    expect(valid).toEqual({
      value: {
        content: "fork creates a child process",
        courseId: "course-1",
        unitId: "unit-1",
        numberOfCards: 10,
      },
    });
    expect(parseGenerateRequest({ content: "", courseId: "c", unitId: "u", numberOfCards: 10 })).toEqual({
      error: "Paste notes, up to 12000 characters.",
    });
    expect(
      parseGenerateRequest({
        content: "x".repeat(MAX_SOURCE_CHARS + 1),
        courseId: "c",
        unitId: "u",
        numberOfCards: 10,
      }),
    ).toEqual({ error: "Paste notes, up to 12000 characters." });
    expect(
      parseGenerateRequest({ content: "notes", courseId: "c", unitId: "u", numberOfCards: 21 }),
    ).toEqual({ error: "Ask for between 1 and 20 cards." });
  });

  it("drops invalid drafts and keeps sanitized fill-blank data", () => {
    expect(sanitizeGeneratedCard({ term: " ", description: "Creates a process." })).toBeNull();
    const card = sanitizeGeneratedCard({
      term: " fork() ",
      description: " Creates a new process. ",
      acceptedAnswers: ["fork()", "fork", "fork", ""],
      fillBlank: { prompt: " _____ creates a new process. ", acceptedAnswers: ["fork()", ""] },
    });
    expect(card).toEqual({
      term: "fork()",
      description: "Creates a new process.",
      acceptedAnswers: ["fork"],
      fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
    });
  });

  it("parses a card array or envelope and rejects empty output", () => {
    const fromArray = parseGenerateResponse([
      { term: "pipe", description: "Connects processes." },
      { term: "", description: "bad" },
    ]);
    expect(fromArray).toEqual({
      cards: [{ term: "pipe", description: "Connects processes.", acceptedAnswers: [] }],
    });
    expect(parseGenerateResponse({ cards: [] })).toEqual({ error: "The model returned unusable drafts." });
    expect(parseGenerateResponse("not-json-object")).toEqual({ error: "The model returned unusable drafts." });
  });

  it("accepts preferFillBlank and synthesizes a blank when the model omits one", () => {
    const parsed = parseGenerateRequest({
      content: "fork creates a child process",
      courseId: "course-1",
      unitId: "unit-1",
      numberOfCards: 5,
      preferFillBlank: true,
    });
    expect(parsed).toMatchObject({ value: { preferFillBlank: true, numberOfCards: 5 } });

    const withTermInDescription = ensureFillBlank({
      term: "fork()",
      description: "fork() creates a new process.",
      acceptedAnswers: ["fork"],
    });
    expect(withTermInDescription.fillBlank).toEqual({
      prompt: "_____ creates a new process.",
      acceptedAnswers: ["fork()", "fork"],
    });

    const fallback = ensureFillBlank({
      term: "pipe",
      description: "Connects processes.",
      acceptedAnswers: [],
    });
    expect(fallback.fillBlank).toEqual({
      prompt: "_____ — Connects processes.",
      acceptedAnswers: ["pipe"],
    });

    const kept = applyFillBlankPreference(
      [
        {
          term: "exec",
          description: "Replaces the process image.",
          acceptedAnswers: [],
          fillBlank: { prompt: "_____ replaces the process image.", acceptedAnswers: ["exec"] },
        },
      ],
      true,
    );
    expect(kept[0]?.fillBlank?.prompt).toBe("_____ replaces the process image.");
    expect(applyFillBlankPreference([{ term: "x", description: "y", acceptedAnswers: [] }], false)[0]?.fillBlank).toBeUndefined();
  });

  it("tolerates common model JSON mismatches", () => {
    expect(
      sanitizeGeneratedCard({
        question: "What creates a new process?",
        answer: "fork()",
        acceptedAnswers: "fork, fork()",
        fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: "fork()" },
      }),
    ).toEqual({
      term: "fork()",
      description: "What creates a new process?",
      acceptedAnswers: ["fork"],
      fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
    });

    expect(
      parseGenerateResponse({
        flashcards: [
          { front: "Connects processes.", back: "pipe" },
          { term: "", description: "ignore me" },
        ],
      }),
    ).toEqual({
      cards: [{ term: "pipe", description: "Connects processes.", acceptedAnswers: [] }],
    });

    expect(extractJsonPayload('Here you go:\n```json\n{"cards":[{"term":"exec","description":"Replaces the image."}]}\n```')).toEqual({
      cards: [{ term: "exec", description: "Replaces the image." }],
    });
    expect(
      readModelText({
        choices: [{ message: { content: [{ type: "text", text: '{"cards":[]}' }] } }],
      }),
    ).toBe('{"cards":[]}');
  });
});
