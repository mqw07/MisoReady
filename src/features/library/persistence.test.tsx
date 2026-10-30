import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryProvider } from "./LibraryProvider.tsx";
import { useLibrary } from "./useLibrary.ts";
import { APP_STATE_STORAGE_KEY } from "../../repositories/storage.ts";
import { App } from "../../App.tsx";
import { emptyAppState } from "../../repositories/schema.ts";
import { insertCard, insertCourse, insertUnit } from "./mutations.ts";

function Probe({ name }: { name: string }) {
  const library = useLibrary();
  return <section aria-label={name}>
    <span data-testid={`${name}-ready`}>{String(library.writeReady)}</span>
    <span data-testid={`${name}-count`}>{library.courses.length}</span>
    <span data-testid={`${name}-error`}>{library.persistError}</span>
    <button onClick={() => library.createCourse(name)}>Create {name}</button>
    <button onClick={library.retrySave}>Retry {name}</button>
  </section>;
}

describe("browser writer coordination", () => {
  for (const scope of ["all", "due"]) {
    it(`restores the ${scope} study screen after partial and completed reloads`, async () => {
      let state = insertCourse(emptyAppState(), "Test").state;
      state = insertUnit(state, state.courses[0]!.id, "Unit")!.state;
      for (const term of ["one", "two"]) state = insertCard(state, state.units[0]!.id, { term, description: `Prompt ${term}`, acceptedAnswers: [] })!.state;
      window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
      window.history.pushState({}, "", `/study?scope=${scope}`);
      let app = render(<App />);
      await screen.findByText("Prompt one");
      fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
      fireEvent.keyDown(window, { key: "g" });
      expect(screen.getByText("Prompt two")).toBeInTheDocument();
      app.unmount();
      app = render(<App />);
      await screen.findByText("Prompt two");
      expect(screen.queryByText("Prompt one")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
      fireEvent.keyDown(window, { key: "e" });
      expect(screen.getByText("Session complete")).toBeInTheDocument();
      const saved = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      app.unmount();
      app = render(<App />);
      await screen.findByText("Session complete");
      expect(window.localStorage.getItem(APP_STATE_STORAGE_KEY)).toBe(saved);
      fireEvent.click(screen.getByRole("button", { name: "Start a new session" }));
      expect(JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!).studySession).toBeUndefined();
      app.unmount();
      window.history.pushState({}, "", "/");
    });
  }

  it("keeps a second tab from writing and reloads latest state on handoff", async () => {
    const first = render(<LibraryProvider><Probe name="first" /></LibraryProvider>);
    await waitFor(() => expect(screen.getByTestId("first-ready")).toHaveTextContent("true"));
    const second = render(<LibraryProvider><Probe name="second" /></LibraryProvider>);
    expect(screen.getByTestId("second-ready")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("Create first"));
    fireEvent.click(screen.getByText("Create second"));
    expect(JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!).courses).toHaveLength(1);
    first.unmount();
    await waitFor(() => expect(screen.getByTestId("second-ready")).toHaveTextContent("true"));
    expect(screen.getByTestId("second-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("Create second"));
    expect(JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!).courses).toHaveLength(2);
    second.unmount();
  });

  it("retains failed writes in memory, warns on reload, and retries successfully", async () => {
    render(<LibraryProvider><Probe name="tab" /></LibraryProvider>);
    await waitFor(() => expect(screen.getByTestId("tab-ready")).toHaveTextContent("true"));
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    fireEvent.click(screen.getByText("Create tab"));
    expect(screen.getByTestId("tab-count")).toHaveTextContent("1");
    expect(screen.getByTestId("tab-error")).toHaveTextContent("Quota exceeded");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    spy.mockImplementation(original);
    fireEvent.click(screen.getByText("Retry tab"));
    expect(screen.getByTestId("tab-error")).toBeEmptyDOMElement();
    expect(JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!).courses).toHaveLength(1);
    const saved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
    spy.mockRestore();
    await act(async () => {});
  });
});
