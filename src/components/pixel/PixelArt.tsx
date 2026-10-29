import type { CSSProperties } from "react";

const TRANSPARENT = new Set([".", " "]);

/** Renders a character map as crisp SVG rects, merging horizontal runs. */
export function PixelArt({
  map,
  colors,
  className = "",
  style,
  title,
}: {
  map: readonly string[];
  colors: Readonly<Record<string, string>>;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const rects: { x: number; y: number; w: number; fill: string }[] = [];

  for (let y = 0; y < height; y += 1) {
    const row = map[y] ?? "";
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? ".";
      const fill = colors[ch];
      if (TRANSPARENT.has(ch) || !fill) {
        x += 1;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w += 1;
      rects.push({ x, y, w, fill });
      x += w;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`pixel overflow-visible ${className}`}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}-${rect.w}`}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  );
}
