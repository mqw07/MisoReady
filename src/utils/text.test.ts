import { describe, expect, it } from "vitest";
import { formatCardCount, formatDueCount, formatPoints, formatStreak, formatUnitCount } from "./format.ts";
import { formatLineList, parseLineList } from "./listText.ts";
import { greetingForHour } from "./greeting.ts";
import { validateName } from "./validateName.ts";

describe("greetingForHour", () => {
  it("follows the local part of the day", () => {
    expect(greetingForHour(0)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(16)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
  });
});

describe("formatters", () => {
  it("pluralizes points, streaks, and units", () => {
    expect(formatPoints(0)).toBe("0 points");
    expect(formatPoints(1)).toBe("1 point");
    expect(formatPoints(12)).toBe("12 points");
    expect(formatStreak(0)).toBe("0-day streak");
    expect(formatStreak(1)).toBe("1-day streak");
    expect(formatUnitCount(1)).toBe("1 unit");
    expect(formatUnitCount(2)).toBe("2 units");
    expect(formatCardCount(0)).toBe("0 cards");
    expect(formatCardCount(1)).toBe("1 card");
    expect(formatDueCount(3)).toBe("3 due");
  });
});

describe("parseLineList", () => {
  it("trims, drops blanks, and de-duplicates", () => {
    expect(parseLineList(" fork()\n\n fork() \nexec\n")).toEqual(["fork()", "exec"]);
    expect(formatLineList(["fork()", "exec"])).toBe("fork()\nexec");
  });
});

describe("validateName", () => {
  it("requires a trimmed name of at most 80 characters", () => {
    expect(validateName("")).toBe("Enter a name.");
    expect(validateName("   ")).toBe("Enter a name.");
    expect(validateName("CSC209")).toBeNull();
    expect(validateName(`  ${"a".repeat(80)}  `)).toBeNull();
    expect(validateName("a".repeat(81))).toBe("Use 80 characters or fewer.");
  });
});
