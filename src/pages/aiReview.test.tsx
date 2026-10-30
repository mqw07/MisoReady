import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { emptyAppState } from "../repositories/schema.ts";
import { APP_STATE_STORAGE_KEY } from "../repositories/storage.ts";
import { insertCard, insertCourse, insertUnit } from "../features/library/mutations.ts";

afterEach(() => { vi.unstubAllGlobals(); window.history.pushState({}, "", "/"); });
async function start(mode = "typed") {
  let state = insertCourse(emptyAppState(), "Probability").state;
  state = insertUnit(state, state.courses[0]!.id, "Random variables")!.state;
  state = insertCard(state, state.units[0]!.id, { term: "Bernouli RV", description: "Name the RV for one binary trial.", acceptedAnswers: [], fillBlank: { prompt: "_____ models one binary trial.", acceptedAnswers: ["Bernouli RV"] } })!.state;
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
  window.history.pushState({}, "", `/study?mode=${mode}`);
  render(<App />);
  const answer = await screen.findByRole("textbox", { name: "Your answer" });
  fireEvent.change(answer, { target: { value: "Bernouli" } });
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  expect(screen.getByText("Incorrect")).toBeInTheDocument();
}
describe("optional AI answer review", () => {
  it("calls AI only on request, blocks rating shortcuts during review, and persists the accepted grade", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);
    await start();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ask AI to double-check" }));
    expect(screen.getByRole("button", { name: "Good, shortcut 3" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "g" });
    expect(screen.queryByText("Session complete")).not.toBeInTheDocument();
    await act(async () => resolve(Response.json({ correct: true, explanation: "RV is implied by this question." })));
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("RV is implied by this question.")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "g" });
    const saved = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
    expect(saved.reviews).toHaveLength(1);
    expect(saved.reviews[0]).toMatchObject({ correct: true, aiReview: { correct: true } });
    expect(saved.reviews[0].pointsEarned).toBeGreaterThan(0);
  });
  it("allows retry after network failure and explains an incorrect fill-blank answer", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(Response.json({ correct: false, explanation: "This context requires an essential qualifier." }));
    vi.stubGlobal("fetch", fetchMock);
    await start("fillBlank");
    fireEvent.click(screen.getByRole("button", { name: "Ask AI to double-check" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Good, shortcut 3" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Ask AI to double-check" }));
    await screen.findByText("This context requires an essential qualifier.");
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("ignores a late AI result after starting a new session", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Ask AI to double-check" }));
    fireEvent.click(screen.getByRole("button", { name: "Start a new session" }));
    await act(async () => resolve(Response.json({ correct: true, explanation: "Old result" })));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument());
    expect(screen.queryByText("Old result")).not.toBeInTheDocument();
  });
});
