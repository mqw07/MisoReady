/**
 * Turns a character pixel map into a compact SVG data URI so large, repeated
 * scenery (like the grass tile) is one cached image instead of hundreds of DOM nodes.
 */
export function pixelMapToSvgUri(
  map: readonly string[],
  colors: Readonly<Record<string, string>>,
): string {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const pathsByColor = new Map<string, string>();

  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? ".";
      const fill = colors[ch];
      if (!fill) {
        x += 1;
        continue;
      }
      let run = 1;
      while (row[x + run] === ch) run += 1;
      pathsByColor.set(fill, `${pathsByColor.get(fill) ?? ""}M${x} ${y}h${run}v1h-${run}z`);
      x += run;
    }
  });

  const paths = [...pathsByColor].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
