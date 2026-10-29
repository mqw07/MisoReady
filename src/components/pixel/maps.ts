/**
 * Hand-placed pixel maps. Each character is a palette key, "." is transparent.
 * Every row of a map must have the same length (see maps.test.ts).
 */

export const sun = [
  ".....r.....",
  "..r..r..r..",
  "...ooooo...",
  "..oyyyyyo..",
  ".roysyyyyor",
  "royyyyyyyor",
  ".royyyyyyor",
  "..oyyyyyo..",
  "...ooooo...",
  "..r..r..r..",
  ".....r.....",
] as const;

export const play = [
  "x......",
  "xxx....",
  "xxxxx..",
  "xxxxxxx",
  "xxxxx..",
  "xxx....",
  "x......",
] as const;

export const home = [
  ".....xx.....",
  "....xxxx....",
  "...xxxxxx...",
  "..xxxxxxxx..",
  ".xxxxxxxxxx.",
  "xxxxxxxxxxxx",
  ".xxxxxxxxxx.",
  ".xxxxxxxxxx.",
  ".xxxx..xxxx.",
  ".xxxx..xxxx.",
  ".xxxx..xxxx.",
] as const;

/** Open book: solid pages with cream text lines. All glyphs are 12px wide so they scale evenly. */
export const book = [
  "xxxxx..xxxxx",
  "xxxxxxxxxxxx",
  "xwwwxxxxwwwx",
  "xxxxxxxxxxxx",
  "xwwwxxxxwwwx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  ".xxxxxxxxxx.",
] as const;

/** Mortarboard with a hanging tassel. */
export const cap = [
  ".....xx.....",
  "...xxxxxx...",
  ".xxxxxxxxxx.",
  "xxxxxxxxxxxx",
  ".xxxxxxxxxx.",
  "..wwwwwwww.x",
  "..xxxxxxxx.x",
  "...xxxxxx.xx",
] as const;

/**
 * Wooden window post, tiled vertically. Left edge catches the light (h), the right side falls
 * into shade (s, S), outlines are o, and g are grain flecks. Row 0 is a plank seam.
 */
export const windowPole = [
  "oSSSSSSo",
  "ohbbbsSo",
  "ohbgbsSo",
  "ohbbbsSo",
  "ohbbgsSo",
  "ohbbbsSo",
  "ohgbbsSo",
  "ohbbbsSo",
  "ohbbbsSo",
  "ohbbgsSo",
  "ohbbbsSo",
  "ohbgbsSo",
  "ohbbbsSo",
  "ohbbbsSo",
  "ohgbbsSo",
  "ohbbbsSo",
] as const;

/** Four-pointed plus sparkle ("c" is the bright core). */
export const plusSpark = [
  "..y..",
  "..y..",
  "yycyy",
  "..y..",
  "..y..",
] as const;

export const calendar = [
  "..x......x..",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xwwwwwwwwwwx",
  "xwwwwwwwwwwx",
  "xwwxwwxwwxwx",
  "xwwwwwwwwwwx",
  "xwwxwwxwwxwx",
  "xwwwwwwwwwwx",
  "xwwwwwwwwwwx",
  "xxxxxxxxxxxx",
] as const;

export const plus = [
  "....xx....",
  "....xx....",
  "....xx....",
  "....xx....",
  "xxxxxxxxxx",
  "xxxxxxxxxx",
  "....xx....",
  "....xx....",
  "....xx....",
  "....xx....",
] as const;

export const bag = [
  "...xxxxxx...",
  "..xx....xx..",
  "..x......x..",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  ".xxxxxxxxxx.",
] as const;

export const note = [
  "xxxxxxxxxx",
  "xwwwwwwwwx",
  "xwxxxxxxwx",
  "xwwwwwwwwx",
  "xwxxxxxxwx",
  "xwwwwwwwwx",
  "xwxxxxxwwx",
  "xwwwwwwwwx",
  "xxxxxxxxxx",
] as const;

function bars(heights: readonly number[], rows: number): string[] {
  const out: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    out.push(heights.map((h) => (y >= rows - h ? "xxx" : "...")).join("."));
  }
  return out;
}

/** Cog with eight teeth: a disc, a centre hole, and teeth along the axes and diagonals. */
function gear(size: number, bodyRadius: number, holeRadius: number): string[] {
  const c = (size - 1) / 2;
  const outer = c + 0.4;
  const out: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let row = "";
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      const tooth =
        r > bodyRadius - 1.2 &&
        r <= outer &&
        (Math.abs(dx) <= 1 || Math.abs(dy) <= 1 || Math.abs(Math.abs(dx) - Math.abs(dy)) <= 1);
      row += (r <= bodyRadius || tooth) && r > holeRadius ? "x" : ".";
    }
    out.push(row);
  }
  return out;
}

export const barsChart = bars([6, 11, 8], 11);
export const gearWheel = gear(11, 3.7, 1.7);
