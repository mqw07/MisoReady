import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.tsx";
import { APP_STATE_STORAGE_KEY } from "./repositories/storage.ts";

afterEach(() => {
  window.history.pushState({}, "", "/");
  vi.unstubAllGlobals();
});

async function createCourseAndUnit(
  user: ReturnType<typeof userEvent.setup>,
  courseName = "CSC209",
  unitName = "Processes",
) {
  await user.click(screen.getByRole("button", { name: "New course" }));
  await user.type(screen.getByRole("textbox", { name: "Course name" }), courseName);
  await user.click(screen.getByRole("button", { name: "Create course" }));
  await user.click(screen.getByRole("button", { name: "Add unit" }));
  await user.type(screen.getByRole("textbox", { name: "Unit name" }), unitName);
  await user.click(screen.getByRole("button", { name: "Create unit" }));
}

describe("Miso shell", () => {
  it("opens on Today with Miso in the dashboard portrait", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: /good (morning|afternoon|evening)/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Due today" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Miso the cat" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /person|human|profile photo|avatar/i })).not.toBeInTheDocument();
    expect(document.title).toBe("Miso");
  });

  it("collapses the desktop sidebar", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Primary" });

    expect(nav).toHaveTextContent("Courses");
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(nav).not.toHaveTextContent("Courses");
  });

  it("creates a course and a unit from the shell", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "New course" }));
    await user.click(screen.getByRole("button", { name: "Create course" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name.");

    await user.type(screen.getByRole("textbox", { name: "Course name" }), "CSC209");
    await user.click(screen.getByRole("button", { name: "Create course" }));
    expect(screen.getByRole("heading", { level: 1, name: "CSC209" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CSC209" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add unit" }));
    await user.type(screen.getByRole("textbox", { name: "Unit name" }), "Processes");
    await user.click(screen.getByRole("button", { name: "Create unit" }));
    expect(screen.getAllByRole("link", { name: "Processes" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    expect(screen.getByRole("heading", { level: 1, name: "Processes" })).toBeInTheDocument();
    expect(screen.getByText("Add a card yourself, or generate editable drafts from notes.")).toBeInTheDocument();
  });

  it("routes the utility pages and the mobile menu", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Shop" }));
    expect(screen.getByRole("heading", { level: 1, name: "Shop" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Stats" }));
    expect(screen.getByRole("heading", { level: 1, name: "Stats" })).toBeInTheDocument();
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Miso" }));
    expect(screen.getByRole("heading", { level: 1, name: "Miso" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("shows a not-found page for unknown addresses", () => {
    window.history.pushState({}, "", "/missing");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("keeps courses, units, and cards after remount", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.type(screen.getByRole("textbox", { name: "Accepted aliases" }), "fork");
    await user.type(screen.getByRole("textbox", { name: "Fill-in-the-blank prompt" }), "_____ creates a new process.");
    await user.type(screen.getByRole("textbox", { name: "Fill-in-the-blank answers" }), "fork()");
    await user.click(screen.getByRole("button", { name: "Create card" }));
    expect(screen.getByRole("heading", { name: "fork()" })).toBeInTheDocument();
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.getByText("Fill-in-the-blank")).toBeInTheDocument();

    first.unmount();
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("link", { name: "CSC209" }).length).toBeGreaterThan(0);
    expect(screen.getByText("1 card is waiting.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "CSC209" })[0]!);
    expect(screen.getByRole("heading", { level: 1, name: "CSC209" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    expect(screen.getByRole("heading", { name: "fork()" })).toBeInTheDocument();
    expect(screen.getByText("Creates a new process.")).toBeInTheDocument();
  });

  it("renames, duplicates, moves, and cascade-deletes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getByRole("button", { name: "Add unit" }));
    await user.type(screen.getByRole("textbox", { name: "Unit name" }), "Memory");
    await user.click(screen.getByRole("button", { name: "Create unit" }));

    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("button", { name: "Edit fork()" }));
    await user.clear(screen.getByRole("textbox", { name: "Description" }));
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Duplicates the calling process.");
    await user.click(screen.getByRole("button", { name: "Save card" }));
    expect(screen.getByText("Duplicates the calling process.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Duplicate fork()" }));
    expect(screen.getAllByRole("heading", { name: "fork()" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Delete fork()" })[0]!);
    await user.click(screen.getByRole("button", { name: "Delete card" }));
    expect(screen.getAllByRole("heading", { name: "fork()" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Move fork()" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "New unit" }),
      screen.getByRole("option", { name: "CSC209 / Memory" }),
    );
    await user.click(screen.getByRole("button", { name: "Move card" }));
    expect(screen.getByText("Add a card yourself, or generate editable drafts from notes.")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "Memory" })[0]!);
    expect(screen.getByRole("heading", { name: "fork()" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.clear(screen.getByRole("textbox", { name: "Unit name" }));
    await user.type(screen.getByRole("textbox", { name: "Unit name" }), "Virtual memory");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByRole("heading", { level: 1, name: "Virtual memory" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "CSC209" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.clear(screen.getByRole("textbox", { name: "Course name" }));
    await user.type(screen.getByRole("textbox", { name: "Course name" }), "Operating Systems");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByRole("heading", { level: 1, name: "Operating Systems" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete course" }));
    expect(screen.queryByRole("link", { name: "Operating Systems" })).not.toBeInTheDocument();
    expect(screen.getByText("No courses yet")).toBeInTheDocument();
  });

  it("reviews a due card in reveal mode and updates the schedule", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("link", { name: "Study due" }));
    expect(screen.getByText("Creates a new process.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Good, shortcut 3/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByText("fork()")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Good, shortcut 3/ }));
    expect(screen.getByRole("heading", { name: "Session complete" })).toBeInTheDocument();
    expect(screen.getByText(/1 card reviewed\. Each rating updated the shared study schedule/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to Today" }));
    expect(screen.getByText("No cards are waiting.")).toBeInTheDocument();
  });

  it("records Study all without rescheduling due cards", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "exec");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Replaces the process image.");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("link", { name: "Study all" }));
    await user.keyboard(" ");
    expect(screen.getByText("exec")).toBeInTheDocument();
    await user.keyboard("3");
    expect(
      screen.getByText(/1 card practiced\. Ratings were recorded\. Schedules did not change/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to Today" }));
    expect(screen.getByText("1 card is waiting.")).toBeInTheDocument();
    expect(screen.getAllByText(/0 points/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0-day streak/).length).toBeGreaterThan(0);
  });

  it("grades a typed answer and awards points on a scheduled review", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.type(screen.getByRole("textbox", { name: "Accepted aliases" }), "fork");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("link", { name: "Study due" }));
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "Fork()");
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("1 correct")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Good, shortcut 3/ }));
    expect(screen.getByRole("heading", { name: "Session complete" })).toBeInTheDocument();
    expect(screen.getByText(/1 correct/)).toBeInTheDocument();
    expect(screen.getAllByText(/points earned/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("link", { name: "Back to Today" }));
    expect(screen.getByText("No cards are waiting.")).toBeInTheDocument();
    expect(screen.getAllByText(/1-day streak/).length).toBeGreaterThan(0);
  });

  it("grades a fill-in-the-blank from a stored prompt", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.type(screen.getByRole("textbox", { name: "Fill-in-the-blank prompt" }), "_____ creates a new process.");
    await user.type(screen.getByRole("textbox", { name: "Fill-in-the-blank answers" }), "fork()");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("link", { name: "Study due" }));
    await user.click(screen.getByRole("button", { name: "Blank" }));
    expect(screen.getByText("_____ creates a new process.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "fork()");
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Correct")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Good, shortcut 3/ }));
    expect(screen.getByRole("heading", { name: "Session complete" })).toBeInTheDocument();
  });

  it("buys round glasses with review points and keeps them equipped after remount", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add card" }));
    await user.type(screen.getByRole("textbox", { name: "Term" }), "fork()");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Creates a new process.");
    await user.click(screen.getByRole("button", { name: "Create card" }));

    await user.click(screen.getByRole("link", { name: "Study due" }));
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: /Good, shortcut 3/ }));
    await user.click(screen.getByRole("link", { name: "Back to Today" }));
    expect(screen.getAllByText(/80 points/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1-day streak/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("link", { name: "Shop" }));
    expect(screen.getByText("Balance: 80 points")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy Round glasses for 50 points" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Brown sunglasses, 10 points more needed" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Buy Round glasses for 50 points" }));
    expect(screen.getByRole("status")).toHaveTextContent("Bought Round glasses.");
    expect(screen.getByText("Balance: 30 points")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Equip Round glasses" }));
    expect(screen.getByRole("status")).toHaveTextContent("Equipped Round glasses.");
    expect(screen.getByRole("button", { name: "Unequip Round glasses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brown sunglasses, 60 points more needed" })).toBeDisabled();

    first.unmount();
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getAllByText(/30 points/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1-day streak/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("link", { name: "Shop" }));
    expect(screen.getByText("Balance: 30 points")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unequip Round glasses" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Miso" }));
    expect(screen.getByRole("button", { name: "Unequip Round glasses" })).toBeInTheDocument();
  });

  it("does not overwrite unreadable saved data", async () => {
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, "{not-json");
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent("Saved study data could not be read");
    await createCourseAndUnit(user);
    expect(window.localStorage.getItem(APP_STATE_STORAGE_KEY)).toBe("{not-json");
  });

  it("lets the user edit and drop AI drafts before saving new cards", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/generate");
      return Response.json({
        cards: [
          { term: "exec", description: "Replaces the process image.", acceptedAnswers: [] },
          { term: "pipe", description: "Connects processes.", acceptedAnswers: ["pipeline"] },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Generate from notes" }));
    await user.type(
      screen.getByRole("textbox", { name: "Study notes" }),
      "exec replaces the process image. A pipe connects processes.",
    );
    await user.click(screen.getByRole("button", { name: "Generate drafts" }));

    expect(await screen.findByText("Draft 1 of 2")).toBeInTheDocument();
    const termFields = screen.getAllByRole("textbox", { name: "Term" });
    await user.clear(termFields[0]!);
    await user.type(termFields[0]!, "wait()");
    await user.click(screen.getByRole("button", { name: "Remove pipe" }));
    await user.click(screen.getByRole("button", { name: "Save cards" }));

    expect(screen.getByRole("heading", { name: "wait()" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "pipe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "exec" })).not.toBeInTheDocument();

    const callsAfterSave = fetchMock.mock.calls.length;
    await user.click(screen.getByRole("link", { name: "Study due" }));
    expect(screen.getByText("Replaces the process image.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByText("wait()")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsAfterSave);
  });

  it("keeps pasted notes when generation fails and creates no cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "The model returned unusable drafts." }, { status: 502 }),
      ),
    );
    const user = userEvent.setup();
    render(<App />);

    await createCourseAndUnit(user);
    await user.click(screen.getAllByRole("link", { name: "Processes" })[0]!);
    await user.click(screen.getByRole("button", { name: "Generate from notes" }));
    await user.type(screen.getByRole("textbox", { name: "Study notes" }), "keep these notes");
    await user.click(screen.getByRole("button", { name: "Generate drafts" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The model returned unusable drafts.");
    expect(screen.getByRole("textbox", { name: "Study notes" })).toHaveValue("keep these notes");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Add a card yourself, or generate editable drafts from notes.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "fork()" })).not.toBeInTheDocument();
  });
});
