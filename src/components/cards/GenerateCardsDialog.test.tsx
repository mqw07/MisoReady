import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestGeneratedCards } from "../../services/ai/client.ts";
import { extractPdfNotes } from "../../services/ai/pdfNotes.ts";
import { GenerateCardsDialog } from "./GenerateCardsDialog.tsx";

vi.mock("../../services/ai/pdfNotes.ts", () => ({
  extractPdfNotes: vi.fn(),
}));

vi.mock("../../services/ai/client.ts", () => ({
  requestGeneratedCards: vi.fn(),
}));

const extractMock = vi.mocked(extractPdfNotes);
const generateMock = vi.mocked(requestGeneratedCards);

const unit = {
  id: "unit-1",
  courseId: "course-1",
  name: "Processes",
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
};

function renderDialog(onCommit = vi.fn()) {
  render(
    <GenerateCardsDialog
      open
      units={[unit]}
      initialUnitId={unit.id}
      lockUnit
      onClose={vi.fn()}
      onCommit={onCommit}
    />,
  );
  return onCommit;
}

beforeEach(() => {
  extractMock.mockReset();
  generateMock.mockReset();
});

describe("GenerateCardsDialog PDF notes", () => {
  it("extracts a PDF, keeps the notes on screen, and uses the fill-in-the-blank checkbox", async () => {
    extractMock.mockResolvedValue({ text: "fork creates a child process", truncated: false });
    generateMock.mockResolvedValue({
      ok: true,
      cards: [
        {
          term: "fork()",
          description: "Creates a new process.",
          acceptedAnswers: [],
          fillBlank: { prompt: "_____ creates a new process.", acceptedAnswers: ["fork()"] },
        },
      ],
    });
    const user = userEvent.setup();
    renderDialog();

    const file = new File(["%PDF-1.1 lecture notes"], "lecture.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("PDF notes"), file);

    expect(await screen.findByText("Using lecture.pdf")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Study notes" })).toHaveValue("fork creates a child process");
    expect(screen.getByRole("checkbox", { name: "Generate fill-in-the-blank prompts" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Generate drafts" }));
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "fork creates a child process",
        unitId: "unit-1",
        preferFillBlank: true,
      }),
      expect.anything(),
    );
    expect(await screen.findByDisplayValue("_____ creates a new process.")).toBeInTheDocument();
  });

  it("sends fill-in-the-blank for pasted notes unless the checkbox is cleared", async () => {
    generateMock.mockResolvedValue({
      ok: true,
      cards: [{ term: "pipe", description: "Connects processes.", acceptedAnswers: [] }],
    });
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole("textbox", { name: "Study notes" }), "a pipe connects processes");
    await user.click(screen.getByRole("button", { name: "Generate drafts" }));
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ content: "a pipe connects processes", preferFillBlank: true }),
      expect.anything(),
    );

    generateMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Back to notes" }));
    await user.click(screen.getByRole("checkbox", { name: "Generate fill-in-the-blank prompts" }));
    await user.click(screen.getByRole("button", { name: "Generate drafts" }));
    const [payload] = generateMock.mock.calls[0]!;
    expect(payload).toMatchObject({ content: "a pipe connects processes" });
    expect(payload).not.toHaveProperty("preferFillBlank");
  });

  it("does not treat a PDF upload as fill-in-the-blank by itself", async () => {
    extractMock.mockResolvedValue({ text: "fork creates a child process", truncated: false });
    generateMock.mockResolvedValue({
      ok: true,
      cards: [{ term: "fork()", description: "Creates a new process.", acceptedAnswers: [] }],
    });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("checkbox", { name: "Generate fill-in-the-blank prompts" }));
    const file = new File(["%PDF-1.1 lecture notes"], "lecture.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("PDF notes"), file);
    expect(await screen.findByText("Using lecture.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate drafts" }));
    const [payload] = generateMock.mock.calls[0]!;
    expect(payload).toMatchObject({ content: "fork creates a child process" });
    expect(payload).not.toHaveProperty("preferFillBlank");
  });

  it("shows a readable error when the PDF has no text", async () => {
    extractMock.mockResolvedValue({ error: "This PDF has no readable text. Try a text PDF or paste notes." });
    const user = userEvent.setup();
    renderDialog();

    const file = new File(["%PDF-1.1"], "scan.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("PDF notes"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This PDF has no readable text. Try a text PDF or paste notes.",
    );
    expect(screen.queryByText(/Using scan.pdf/)).not.toBeInTheDocument();
  });
});
