import { seeded } from "./seeded.ts";

/**
 * Procedurally rasterised pixel clouds. Each cloud is a union of circular puffs
 * with a flat base, shaded in three tones so the underside reads as shadow.
 * Keys: i = cream white top, m = soft mid tone, b = lavender underside shadow.
 */
type Puff = readonly [cx: number, cy: number, r: number];

function buildCloud(width: number, height: number, baseY: number, puffs: readonly Puff[]): string[] {
  const rows: string[] = [];
  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const inside =
        y <= baseY && puffs.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
      if (!inside) row += ".";
      else if (y === baseY) row += "b";
      else if (y === baseY - 1) row += "m";
      else row += "i";
    }
    rows.push(row);
  }
  return rows;
}

/** Long, layered bank with five puffs. */
export const cloudWide = buildCloud(64, 20, 18, [
  [8, 14, 5],
  [18, 11, 8],
  [31, 8, 8],
  [43, 11, 7],
  [54, 14, 6],
  [34, 14, 7],
  [22, 15, 6],
]);

/** Tall towering cloud with one dominant puff. */
export const cloudTall = buildCloud(40, 24, 22, [
  [10, 18, 6],
  [21, 11, 10],
  [32, 17, 7],
  [21, 18, 8],
]);

/** Small round cloud. */
export const cloudSmall = buildCloud(36, 13, 11, [
  [8, 9, 4],
  [17, 6, 6],
  [27, 8, 5],
  [18, 9, 6],
]);

/** Thin stretched wisp. */
export const cloudWisp = buildCloud(56, 10, 8, [
  [8, 6, 3],
  [20, 5, 5],
  [34, 5, 5],
  [46, 6, 4],
  [28, 6, 4],
]);

/**
 * A seamless horizontal cloud bank that fills everything below its bumpy top edge.
 * In the reference the lower sky is one soft cream mass, so the body matches the page
 * colour. Keys: h = white rim on top edges, i = cream body, s = soft shadow on left edges.
 */
function buildBank(width: number, height: number, seed: number): string[] {
  const rand = seeded(seed);
  const puffs: Puff[] = [];
  for (let cx = 0; cx < width; cx += 9 + Math.floor(rand() * 6)) {
    puffs.push([cx, 12 + Math.floor(rand() * 9), 7 + Math.floor(rand() * 5)]);
  }
  const ground = height - 9;
  const inside = (x: number, y: number): boolean => {
    if (y < 0) return false;
    if (y >= ground) return true;
    return puffs.some(([cx, cy, r]) => {
      const gap = Math.abs(x + 0.5 - cx);
      const dx = Math.min(gap, width - gap);
      return dx * dx + (y + 0.5 - cy) ** 2 <= r * r;
    });
  };
  const rows: string[] = [];
  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      if (!inside(x, y)) row += ".";
      else if (!inside(x, y - 1)) row += "h";
      else if (!inside((x - 1 + width) % width, y) || !inside((x - 1 + width) % width, y + 1)) row += "s";
      else row += "i";
    }
    rows.push(row);
  }
  return rows;
}

export const BANK_TILE_W = 120;
export const cloudBank = buildBank(BANK_TILE_W, 30, 5);
