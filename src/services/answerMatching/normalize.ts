const WRAP_QUOTES = /^["'`“”‘’]+|["'`“”‘’]+$/gu;
const TRAILING_SENTENCE = /[.,;:!?¡¿…]+$/u;

/**
 * Harmless wrappers only: quotes and trailing sentence punctuation.
 * Technical tokens such as C++, fork(), 3.14, and 2+2 keep their symbols.
 */
export function normalizeAnswer(value: string): string {
  let text = value.normalize("NFKC").trim().toLocaleLowerCase();
  text = text.replace(/\s+/g, " ");
  text = text.replace(WRAP_QUOTES, "");
  text = text.replace(TRAILING_SENTENCE, "");
  return text.trim();
}
