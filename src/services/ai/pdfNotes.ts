import { MAX_SOURCE_CHARS } from "./contract.ts";

export const MAX_PDF_BYTES = 8 * 1024 * 1024;

export function isPdfNotesFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function itemsToPageText(items: readonly unknown[]): string {
  return items
    .map((item) => {
      if (item && typeof item === "object" && "str" in item && typeof item.str === "string") {
        return item.str;
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function notesFromPdfPages(pages: readonly string[]): string {
  return pages
    .map((page) => page.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function clipExtractedNotes(text: string): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_SOURCE_CHARS) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, MAX_SOURCE_CHARS).trimEnd(), truncated: true };
}

export async function extractPdfNotes(
  file: File,
): Promise<{ text: string; truncated: boolean } | { error: string }> {
  if (!isPdfNotesFile(file)) return { error: "Choose a PDF file." };
  if (file.size === 0) return { error: "That PDF is empty." };
  if (file.size > MAX_PDF_BYTES) return { error: "That PDF is too large. Try a smaller file or paste notes." };

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }
    const document = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToPageText(content.items));
    }
    const combined = notesFromPdfPages(pages);
    if (!combined) return { error: "This PDF has no readable text. Try a text PDF or paste notes." };
    return clipExtractedNotes(combined);
  } catch {
    return { error: "Could not read that PDF. Try another file or paste notes." };
  }
}
