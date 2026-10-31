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

export async function extractPdfNotes(
  file: File,
  signal?: AbortSignal,
): Promise<{ text: string; truncated: false; pages: string[]; unreadablePages: number[] } | { error: string }> {
  if (!isPdfNotesFile(file)) return { error: "Choose a PDF file." };
  if (file.size === 0) return { error: "That PDF is empty." };
  if (file.size > MAX_PDF_BYTES) return { error: "That PDF is too large. Try a smaller file or paste notes." };

  let dispose: (() => Promise<void>) | undefined;
  try {
    signal?.throwIfAborted();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }
    const loading = pdfjs.getDocument({ data });
    dispose = () => loading.destroy();
    const document = await loading.promise;
    const unreadablePages: number[] = [];
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      signal?.throwIfAborted();
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = itemsToPageText(content.items);
      pages.push(text);
      if (!text) unreadablePages.push(pageNumber);
      page.cleanup();
    }
    const combined = notesFromPdfPages(pages);
    if (!combined) return { error: "This PDF has no readable text. Try a text PDF or paste notes." };
    signal?.throwIfAborted();
    return { text: combined, truncated: false, pages, unreadablePages };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { error: "Could not read that PDF. Try another file or paste notes." };
  } finally {
    await dispose?.();
  }
}
