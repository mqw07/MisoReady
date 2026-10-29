import { describe, expect, it } from "vitest";
import { validateCardForm } from "./validateCard.ts";

describe("validateCardForm", () => {
  it("requires a unit, term, and description", () => {
    const result = validateCardForm({
      unitId: " ",
      term: " ",
      description: "",
      aliasesText: "",
      fillBlankPrompt: "",
      fillBlankAnswersText: "",
    });
    expect(result).toEqual({
      errors: {
        unitId: "Choose a unit.",
        term: "Enter a term.",
        description: "Enter a description.",
      },
    });
  });

  it("accepts aliases and optional fill-blank together", () => {
    const result = validateCardForm({
      unitId: "unit-1",
      term: "fork()",
      description: "Creates a new process.",
      aliasesText: "fork\nfork()",
      fillBlankPrompt: "_____ creates a new process.",
      fillBlankAnswersText: "fork()\nfork",
    });
    expect(result).toEqual({
      value: {
        unitId: "unit-1",
        content: {
          term: "fork()",
          description: "Creates a new process.",
          acceptedAnswers: ["fork", "fork()"],
          fillBlank: {
            prompt: "_____ creates a new process.",
            acceptedAnswers: ["fork()", "fork"],
          },
        },
      },
    });
  });

  it("rejects a fill-blank prompt without answers", () => {
    const result = validateCardForm({
      unitId: "unit-1",
      term: "fork()",
      description: "Creates a new process.",
      aliasesText: "",
      fillBlankPrompt: "_____ creates a new process.",
      fillBlankAnswersText: "",
    });
    expect(result).toMatchObject({
      errors: { fillBlank: "Add at least one fill-in-the-blank answer." },
    });
  });
});
