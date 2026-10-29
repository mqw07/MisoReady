import { describe, expect, it } from "vitest";
import { MAX_SOURCE_CHARS } from "./contract.ts";
import {
  clipExtractedNotes,
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

  it("clips extracted notes to the generation limit", () => {
    expect(clipExtractedNotes("  wait()  ")).toEqual({ text: "wait()", truncated: false });
    const long = "x".repeat(MAX_SOURCE_CHARS + 8);
    const clipped = clipExtractedNotes(long);
    expect(clipped.truncated).toBe(true);
    expect(clipped.text).toHaveLength(MAX_SOURCE_CHARS);
  });
});
