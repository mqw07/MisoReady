export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const previous = new Array<number>(cols);
  const current = new Array<number>(cols);

  for (let j = 0; j < cols; j += 1) previous[j] = j;

  for (let i = 1; i < rows; i += 1) {
    current[0] = i;
    const aChar = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j += 1) {
      const insert = (current[j - 1] ?? 0) + 1;
      const remove = (previous[j] ?? 0) + 1;
      const substitute = (previous[j - 1] ?? 0) + (aChar === b.charCodeAt(j - 1) ? 0 : 1);
      current[j] = Math.min(insert, remove, substitute);
    }
    for (let j = 0; j < cols; j += 1) previous[j] = current[j] ?? 0;
  }

  return previous[b.length] ?? b.length;
}

export function maxEdits(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return Math.max(1, Math.floor(length * 0.12));
}
