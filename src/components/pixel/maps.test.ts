import { describe, expect, it } from "vitest";
import * as clouds from "./clouds.ts";
import * as maps from "./maps.ts";

const cloudShapes = {
  cloudWide: clouds.cloudWide,
  cloudTall: clouds.cloudTall,
  cloudSmall: clouds.cloudSmall,
  cloudWisp: clouds.cloudWisp,
};

describe("pixel maps", () => {
  it("keeps every row the same width so shapes cannot skew", () => {
    for (const [name, map] of Object.entries({ ...maps, ...cloudShapes, cloudBank: clouds.cloudBank })) {
      const widths = new Set((map as readonly string[]).map((row) => row.length));
      expect(widths.size, `${name} has rows of different widths`).toBe(1);
    }
  });

  it("draws every cloud with a shaded base and no stray palette keys", () => {
    for (const [name, map] of Object.entries(cloudShapes)) {
      const joined = map.join("");
      expect(joined, name).toMatch(/b/);
      expect(joined.replace(/[.imb]/g, ""), name).toBe("");
    }
  });
});
