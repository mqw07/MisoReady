import { describe, expect, it } from "vitest";
import { levenshtein, maxEdits } from "./levenshtein.ts";
import { matchAnswer } from "./matchAnswer.ts";
import { normalizeAnswer } from "./normalize.ts";

describe("normalizeAnswer", () => {
  it("applies NFKC, trim, lowercase, and collapsed spaces", () => {
    expect(normalizeAnswer("  Café\u00a0LATTE  ")).toBe("café latte");
    expect(normalizeAnswer("FORKE()".normalize("NFKD"))).toBe(normalizeAnswer("FORKE()"));
    expect(normalizeAnswer("ﬁle")).toBe("file");
  });

  it("strips wrapping quotes and trailing sentence punctuation", () => {
    expect(normalizeAnswer('"CPU"')).toBe("cpu");
    expect(normalizeAnswer("fork().")).toBe("fork()");
    expect(normalizeAnswer("process,")).toBe("process");
  });

  it("keeps technical symbols, decimals, and operators", () => {
    expect(normalizeAnswer("C++")).toBe("c++");
    expect(normalizeAnswer("fork()")).toBe("fork()");
    expect(normalizeAnswer("3.14")).toBe("3.14");
    expect(normalizeAnswer("2+2")).toBe("2+2");
    expect(normalizeAnswer("-3")).toBe("-3");
  });
});

describe("maxEdits", () => {
  it("follows the conservative typo policy", () => {
    expect(maxEdits(1)).toBe(0);
    expect(maxEdits(4)).toBe(0);
    expect(maxEdits(5)).toBe(1);
    expect(maxEdits(8)).toBe(1);
    expect(maxEdits(9)).toBe(1);
    expect(maxEdits(17)).toBe(2);
  });
});

describe("matchAnswer", () => {
  it("matches canonical answers case-insensitively", () => {
    expect(matchAnswer("Fork()", "fork()")).toMatchObject({
      correct: true,
      matchType: "exact",
      matchedAnswer: "fork()",
      distance: 0,
    });
  });

  it("matches aliases before fuzzy", () => {
    expect(matchAnswer("execve", "exec", ["execve"])).toMatchObject({
      correct: true,
      matchType: "alias",
      matchedAnswer: "execve",
      distance: 0,
    });
  });

  it("allows one typo on medium answers and a bounded typo on long ones", () => {
    expect(matchAnswer("proces", "process")).toMatchObject({
      correct: true,
      matchType: "fuzzy",
      matchedAnswer: "process",
      distance: 1,
    });
    expect(matchAnswer("programing", "programming")).toMatchObject({
      correct: true,
      matchType: "fuzzy",
      distance: 1,
    });
  });

  it("does not equate short technical tokens", () => {
    expect(matchAnswer("GPU", "CPU")).toEqual({ correct: false, matchType: "none" });
    expect(matchAnswer("cp", "cpu")).toEqual({ correct: false, matchType: "none" });
    expect(matchAnswer("git", "got")).toEqual({ correct: false, matchType: "none" });
  });

  it("does not strip meaning from C++, fork(), or numbers", () => {
    expect(matchAnswer("c++", "C++")).toMatchObject({ correct: true, matchType: "exact" });
    expect(matchAnswer("C", "C++")).toMatchObject({ correct: false, matchType: "none" });
    expect(matchAnswer("fork()", "fork()")).toMatchObject({ correct: true, matchType: "exact" });
    expect(matchAnswer("fork", "fork()")).toMatchObject({ correct: false, matchType: "none" });
    expect(matchAnswer("314", "3.14")).toEqual({ correct: false, matchType: "none" });
    expect(matchAnswer("2-2", "2+2")).toEqual({ correct: false, matchType: "none" });
  });

  it("rejects empty input", () => {
    expect(matchAnswer("   ", "fork()")).toEqual({ correct: false, matchType: "none" });
  });
});

describe("levenshtein", () => {
  it("counts inserts, deletes, and substitutions", () => {
    expect(levenshtein("kitten", "kitten")).toBe(0);
    expect(levenshtein("kitten", "sitten")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});
