export function parseLineList(text: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }
  return values;
}

export function formatLineList(values: string[]): string {
  return values.join("\n");
}
