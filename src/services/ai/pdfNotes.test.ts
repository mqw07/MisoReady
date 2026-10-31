import { describe, expect, it } from "vitest";
import { MAX_SOURCE_CHARS } from "./contract.ts";
import {
  isPdfNotesFile,
  itemsToPageText,
  notesFromPdfPages,
} from "./pdfNotes.ts";

describe("PDF note extraction", () => {
  it("accepts PDF files by type or extension", () => {
    expect(isPdfNotesFile(new File([], "notes.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isPdfNotesFile(new File([], "Notes.PDF", { type: "" }))).toBe(true);
    expect(isPdfNotesFile(new File([], "notes.txt", { type: "text/plain" }))).toBe(false);
  });

  it("joins page items and pages into readable notes", () => {
    expect(itemsToPageText([{ str: "fork" }, { str: "creates" }, { type: "ignore" }])).toBe("fork creates");
    expect(notesFromPdfPages(["  fork creates  ", "", "  a process  "])).toBe("fork creates\n\na process");
  });

  it("preserves notes beyond the former generation limit", () => {
    const long = "x".repeat(MAX_SOURCE_CHARS + 8000);
    expect(notesFromPdfPages([long, "Final page concept"])).toBe(`${long}\n\nFinal page concept`);
  });
});
