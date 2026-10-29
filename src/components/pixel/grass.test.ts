import { describe, expect, it } from "vitest";
import { BANK_TILE_W, cloudBank } from "./clouds.ts";
import { GRASS_TILE_W, grassColors, grassTiles } from "./grass.ts";
import { bankColors } from "./palettes.ts";
import { pixelMapToSvgUri } from "./pixelSvg.ts";

describe("grass tiles", () => {
  it("are the declared width and only use known palette keys", () => {
    for (const [name, tile] of Object.entries(grassTiles)) {
      for (const row of tile) {
        expect(row, name).toHaveLength(GRASS_TILE_W);
        expect(row.replace(/\./g, "").split("").every((ch) => ch in grassColors), name).toBe(true);
      }
    }
  });

  it("are dense with ground cover, and the meadow has several flower colours", () => {
    for (const [name, tile] of Object.entries(grassTiles)) {
      const joined = tile.join("");
      expect(joined.replace(/\./g, "").length / joined.length, name).toBeGreaterThan(0.3);
      expect(tile[tile.length - 1], name).not.toContain(".");
    }
    const meadow = grassTiles.meadow.join("");
    for (const petal of ["f", "p", "o"]) expect(meadow).toContain(petal);
    expect(grassTiles.flat.join("")).not.toMatch(/[fpo]/);
  });

  it("renders to compact data URIs", () => {
    for (const tile of Object.values(grassTiles)) {
      const uri = pixelMapToSvgUri(tile, grassColors);
      expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
      expect(uri.length).toBeLessThan(60000);
    }
  });
});

describe("cloud bank", () => {
  it("is a seamless tile with a bumpy white rim and a solid base", () => {
    expect(cloudBank.every((row) => row.length === BANK_TILE_W)).toBe(true);
    const joined = cloudBank.join("");
    expect(joined).toContain("h");
    expect(joined.replace(/[.his]/g, "")).toBe("");
    expect(cloudBank[cloudBank.length - 1]).not.toContain(".");
    expect(pixelMapToSvgUri(cloudBank, bankColors).length).toBeLessThan(60000);
  });
});
