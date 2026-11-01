import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { insertCard, insertCourse, insertUnit } from "../features/library/mutations.ts";
import { emptyAppState } from "../repositories/schema.ts";
import { APP_STATE_STORAGE_KEY } from "../repositories/storage.ts";

beforeEach(() => window.history.replaceState({}, "", "/"));
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

function seedLibrary() {
  let state = insertCourse(emptyAppState(), "Probability", { id: "probability" }).state;
  state = insertUnit(state, "probability", "Week 7", { id: "week-7" })!.state;
  state = insertCard(state, "week-7", { term: "Uniform distribution", description: "Constant density over an interval.", acceptedAnswers: [] })!.state;
  const saved = JSON.stringify(state);
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, saved);
  return saved;
}

describe("public landing page", () => {
  it("renders and grades the local example without reading storage, taking a writer lock, or calling AI", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const lock = vi.spyOn(navigator.locks, "request");
    const fetch = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "A calmer way to learn." })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "UNIFORM distribution{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Correct");
    await user.click(screen.getByRole("button", { name: "Try another" }));
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "wrong{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("The answer is expected value");
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText("expected value", { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("heading", { name: "expected value" })).toBeInTheDocument();
    expect(read).not.toHaveBeenCalledWith(APP_STATE_STORAGE_KEY);
    expect(write).not.toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("opens the existing library at /app without changing its storage document", async () => {
    const saved = seedLibrary();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Start with your notes" }));
    await screen.findByRole("navigation", { name: "Primary" });
    expect(window.location.pathname).toBe("/app");
    expect(screen.getAllByRole("link", { name: "Probability" })[0]).toHaveAttribute("href", "/app/courses/probability");
    expect(window.localStorage.getItem(APP_STATE_STORAGE_KEY)).toBe(saved);
    await user.click(screen.getAllByRole("link", { name: "Week 7" })[0]!);
    expect(window.location.pathname).toBe("/app/courses/probability/units/week-7");
    expect(screen.getByRole("heading", { name: "Uniform distribution" })).toBeInTheDocument();
  });

  it("allows a public tab alongside an active study tab without queuing for its lock", async () => {
    seedLibrary();
    window.history.replaceState({}, "", "/app");
    const study = render(<App />);
    await screen.findByRole("navigation", { name: "Primary" });
    window.history.pushState({}, "", "/");
    const lock = vi.spyOn(navigator.locks, "request");
    const landing = render(<App />);
    expect(screen.getByRole("heading", { name: "A calmer way to learn." })).toBeInTheDocument();
    expect(lock).not.toHaveBeenCalled();
    landing.unmount();
    study.unmount();
  });
});

describe("application route migration", () => {
  for (const [oldPath, heading] of [["/learn", "Learn"], ["/study", "Study"], ["/miso", "Miso"], ["/shop", "Shop"], ["/stats", "Stats"], ["/settings", "Settings"], ["/courses/probability", "Probability"], ["/courses/probability/units/week-7", "Week 7"]]) {
    it(`replaces ${oldPath} while retaining query strings and fragments`, async () => {
      seedLibrary();
      window.history.replaceState({}, "", `${oldPath}?scope=all&courseId=probability#example`);
      const historyLength = window.history.length;
      render(<App />);
      await screen.findByRole("heading", { level: 1, name: heading });
      expect(window.location.pathname).toBe(`/app${oldPath}`);
      expect(window.location.search).toBe("?scope=all&courseId=probability");
      expect(window.location.hash).toBe("#example");
      expect(window.history.length).toBe(historyLength);
    });
  }

  it("keeps failed saves and the writer lock alive until retry succeeds before leaving", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Start with your notes" }));
    await user.click(await screen.findByRole("button", { name: "New course" }));
    await user.type(screen.getByRole("textbox", { name: "Course name" }), "Recover me");
    const original = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    await user.click(screen.getByRole("button", { name: "Create course" }));
    expect(screen.getByRole("heading", { level: 1, name: "Recover me" })).toBeInTheDocument();
    await act(async () => window.history.go(-2));
    await screen.findByRole("dialog", { name: "Save your progress before leaving" });
    expect(screen.getByRole("heading", { level: 1, name: "Recover me" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discard drafts and leave" })).not.toBeInTheDocument();
    write.mockImplementation(original);
    await user.click(within(screen.getByRole("dialog", { name: "Save your progress before leaving" })).getByRole("button", { name: "Retry saving" }));
    await screen.findByRole("heading", { name: "A calmer way to learn." });
    expect(JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!).courses[0].name).toBe("Recover me");
    await user.click(screen.getByRole("link", { name: "Start with your notes" }));
    await screen.findByRole("navigation", { name: "Primary" });
    expect(screen.getAllByRole("link", { name: "Recover me" }).length).toBeGreaterThan(0);
  });

  it("offers to keep or explicitly discard unfinished generation before returning to the public page", async () => {
    seedLibrary();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Start with your notes" }));
    await user.click((await screen.findAllByRole("link", { name: "Week 7" }))[0]!);
    await user.click(screen.getByRole("button", { name: "Generate from notes" }));
    fireEvent.change(screen.getByRole("textbox", { name: /notes/i }), { target: { value: "Synthetic probability notes." } });
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await act(async () => window.history.go(-2));
    await screen.findByRole("dialog", { name: "Leave your card drafts?" });
    await user.click(screen.getByRole("button", { name: "Stay in Miso" }));
    expect(screen.getByRole("textbox", { name: /notes/i })).toHaveValue("Synthetic probability notes.");
    await act(async () => window.history.go(-2));
    await screen.findByRole("dialog", { name: "Leave your card drafts?" });
    await user.click(screen.getByRole("button", { name: "Discard drafts and leave" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });
});
