import { seeded } from "./seeded.ts";

/**
 * Procedurally drawn meadow tiles: layered grass blades with optional flowers standing
 * between them. Tiles are deterministic (seeded) and wrap horizontally so they repeat
 * without a seam.
 *
 * Palette keys: d/g/l/t = dark, mid, light, tip greens; f/k = white petals and their shade;
 * p/q = pink petals and shade; o/r = buttercup yellow and its orange centre; y = flower centre.
 */
export const GRASS_TILE_W = 150;

type Tones = readonly [base: string, mid: string, tip: string];
type Head = readonly string[];
type Rows = readonly [step: number, minHeight: number, spread: number];

const DAISY: Head = [".fff.", "ffyff", "fyyyf", "ffyfk", ".fkk."];
const PINK: Head = [".ppp.", "ppypp", "pyyyp", "ppypq", ".pqq."];
const BUTTERCUP: Head = [".ooo.", "ooroo", ".ooo."];

interface MeadowOptions {
  height: number;
  seed: number;
  back: Rows;
  mid: Rows;
  front: Rows;
  /** Flower heads in left-to-right order; empty for plain grass. */
  flowers: readonly Head[];
  /** Highest row a flower head may start on, and how many rows it may vary by. */
  flowerTop: readonly [min: number, spread: number];
}

function buildMeadow(options: MeadowOptions): string[] {
  const W = GRASS_TILE_W;
  const { height: H } = options;
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill("."));
  const rand = seeded(options.seed);

  const put = (x: number, y: number, ch: string) => {
    if (y < 0 || y >= H) return;
    const row = grid[y];
    if (row) row[((x % W) + W) % W] = ch;
  };

  /** One curved blade; the darker second column on its lower half gives it thickness. */
  const blade = (x: number, height: number, lean: number, tones: Tones) => {
    for (let i = 0; i < height; i += 1) {
      const progress = i / height;
      const y = H - 1 - i;
      const dx = Math.round(lean * progress * progress * 3);
      const tone = progress > 0.78 ? tones[2] : progress > 0.4 ? tones[1] : tones[0];
      put(x + dx, y, tone);
      if (progress < 0.6) put(x + dx + 1, y, tones[0]);
    }
  };

  const layer = ([step, minHeight, spread]: Rows, tones: Tones) => {
    for (let x = 0; x < W; x += step + Math.floor(rand() * 2)) {
      blade(x, minHeight + Math.floor(rand() * spread), Math.floor(rand() * 3) - 1, tones);
    }
  };

  // Back row: tall and dark, so the meadow has depth.
  layer(options.back, ["d", "g", "l"]);

  // Flowers on stems with small leaves, standing between the back and middle rows.
  const spacing = Math.floor(W / Math.max(1, options.flowers.length));
  options.flowers.forEach((head, index) => {
    const cx = 5 + index * spacing + Math.floor(rand() * 4);
    const top = options.flowerTop[0] + Math.floor(rand() * options.flowerTop[1]);
    head.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        if (ch !== ".") put(cx + dx - 2, top + dy, ch);
      });
    });
    for (let y = top + head.length; y < H; y += 1) {
      put(cx, y, y % 3 === 0 ? "d" : "g");
    }
    const leafY = top + head.length + 2;
    put(cx + 1, leafY, "l");
    put(cx + 2, leafY - 1, "l");
    put(cx - 1, leafY + 2, "l");
    put(cx - 2, leafY + 1, "l");
  });

  // Middle and front rows overlap the stems and each other for volume.
  layer(options.mid, ["g", "l", "t"]);
  layer(options.front, ["l", "t", "t"]);

  // Ground band.
  for (let x = 0; x < W; x += 1) {
    put(x, H - 1, "d");
    put(x, H - 2, rand() < 0.6 ? "d" : "g");
    if (rand() < 0.35) put(x, H - 3, "g");
  }

  return grid.map((row) => row.join(""));
}

/** Tall meadow with a dozen flowers, for hero panels such as the Miso page. */
const meadow = buildMeadow({
  height: 22,
  seed: 11,
  back: [3, 8, 6],
  mid: [2, 5, 5],
  front: [2, 3, 4],
  flowers: [DAISY, PINK, DAISY, BUTTERCUP, PINK, DAISY, DAISY, PINK, BUTTERCUP, DAISY, PINK, DAISY, BUTTERCUP],
  flowerTop: [1, 7],
});

/** Low grass with a few daisies, for card edges and the windowsill. */
const low = buildMeadow({
  height: 12,
  seed: 5,
  back: [3, 4, 5],
  mid: [2, 3, 4],
  front: [2, 2, 3],
  flowers: [DAISY, PINK, DAISY, DAISY, BUTTERCUP, DAISY],
  flowerTop: [0, 3],
});

/** Short lawn with no flowers, so captions under a preview scene stay readable. */
const flat = buildMeadow({
  height: 10,
  seed: 3,
  back: [3, 4, 3],
  mid: [2, 3, 2],
  front: [2, 2, 2],
  flowers: [],
  flowerTop: [0, 1],
});

export const grassTiles = { meadow, low, flat } as const;
export type GrassVariant = keyof typeof grassTiles;

/** Soft, sunlit greens that match the pastel reference rather than a dark lawn. */
export const grassColors = {
  d: "#7fa862",
  g: "#98c07a",
  l: "#b4d68f",
  t: "#d3eaa9",
  f: "#ffffff",
  k: "#e9dcbc",
  y: "#f6c85f",
  p: "#f4a6bd",
  q: "#d9738f",
  o: "#ffd25a",
  r: "#f08a3c",
} as const;
