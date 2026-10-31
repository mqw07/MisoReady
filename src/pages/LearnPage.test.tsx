import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App.tsx";
import { emptyAppState } from "../repositories/schema.ts";
import { APP_STATE_STORAGE_KEY } from "../repositories/storage.ts";
import { insertCard, insertCourse, insertUnit } from "../features/library/mutations.ts";
import { startLearn, type LearnSession } from "../features/study/learn.ts";
import type { AppState } from "../types/domain.ts";

const sessionKey = JSON.stringify(["course", "unit"]);
const now = new Date("2026-10-31T12:00:00.000Z");
function library(storedBlank = true): AppState {
  let state = insertCourse(emptyAppState(), "Learn course", { id: "course", now }).state;
  state = insertUnit(state, "course", "Greek letters", { id: "unit", now })!.state;
  return insertCard(state, "unit", { term: "Alpha", description: "First letter", acceptedAnswers: ["alpha letter"],
    ...(storedBlank ? { fillBlank: { prompt: "_____ is the first Greek letter.", acceptedAnswers: ["Alpha", "alpha letter"] } } : {}),
  }, { id: "card", now })!.state;
}
function save(state: AppState) { window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state)); }
function loaded(): AppState { return JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!); }
function mount(state: AppState) {
  save(state);
  window.history.pushState({}, "", "/learn?courseId=course&unitId=unit");
  return render(<App />);
}
afterEach(() => window.history.pushState({}, "", "/"));

async function correctAnswer(user: ReturnType<typeof userEvent.setup>, answer = "Alpha") {
  await user.type(screen.getByRole("textbox", { name: "Your answer" }), `${answer}{Enter}`);
  expect(screen.getByText("Correct")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("Learn screen", () => {
  it("removes multiple choice and immediately alternates typing and blanks through mastery", async () => {
    const state = library();
    const user = userEvent.setup();
    mount(state);
    await screen.findByText("Set up your learning session");
    expect(screen.queryByRole("checkbox", { name: "Multiple choice" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Typing" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Fill in the blank" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Flashcards" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Start learning" }));
    expect(screen.getByRole("heading", { name: "First letter" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await correctAnswer(user, "alpha letter");
    expect(screen.getByRole("heading", { name: "_____ is the first Greek letter." })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("");
    await correctAnswer(user, "alpha");
    expect(screen.getByText("Learning cycle complete")).toBeInTheDocument();
    const persisted = loaded();
    expect(persisted.learnSession?.attempts.map(attempt => attempt.type)).toEqual(["written", "fillBlank"]);
    expect(persisted.cards).toEqual(state.cards);
    expect(persisted.reviews).toEqual(state.reviews);
    expect(persisted.progress).toEqual(state.progress);
  });

  it("shows input before optional flashcards and then uses the selected blank format", async () => {
    const user = userEvent.setup();
    mount(library());
    await user.click(await screen.findByRole("checkbox", { name: "Flashcards" }));
    await user.click(screen.getByRole("button", { name: "Start learning" }));
    await correctAnswer(user);
    await user.click(screen.getByRole("button", { name: "Reveal answer" }));
    await user.click(screen.getByRole("button", { name: "I remembered" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "_____ is the first Greek letter." })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
    await correctAnswer(user);
    expect(screen.getByText("Learning cycle complete")).toBeInTheDocument();
  });

  for (const storedBlank of [true, false]) {
    it(`supports blank-only input ${storedBlank ? "with a saved prompt" : "without saved blank data"}`, async () => {
      const user = userEvent.setup();
      mount(library(storedBlank));
      await user.click(await screen.findByRole("checkbox", { name: "Typing" }));
      await user.click(screen.getByRole("button", { name: "Start learning" }));
      expect(screen.getByRole("heading", { name: storedBlank ? "_____ is the first Greek letter." : "_____ — First letter" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
      await correctAnswer(user);
      expect(loaded().learnSession?.attempts[0]?.type).toBe("fillBlank");
    });
  }

  it("handles a mistake, corrective typing, retry and mastery", async () => {
    const state = library();
    const session = startLearn(state.cards, sessionKey);
    session.types = ["written"];
    session.retype = true;
    const user = userEvent.setup();
    mount({ ...state, learnSession: session });
    await user.type(await screen.findByRole("textbox", { name: "Your answer" }), "wrong{Enter}");
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Retype the correct answer" }), "Alpha{Enter}");
    expect(loaded().learnSession?.progress[0]?.recall).toBe(0);
    await correctAnswer(user);
    await correctAnswer(user);
    expect(screen.getByText("Learning cycle complete")).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 mastered/)).toBeInTheDocument();
  });

  it("applies settings changes immediately instead of falling back to the old saved mode", async () => {
    const user = userEvent.setup();
    mount(library());
    await user.click(await screen.findByRole("checkbox", { name: "Fill in the blank" }));
    await user.click(screen.getByRole("button", { name: "Start learning" }));
    await correctAnswer(user);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("checkbox", { name: "Typing" }));
    await user.click(screen.getByRole("checkbox", { name: "Fill in the blank" }));
    await user.click(screen.getByRole("button", { name: "Start learning" }));
    expect(screen.getByRole("heading", { name: "_____ is the first Greek letter." })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
    expect(loaded().learnSession?.types).toEqual(["fillBlank"]);
    expect(loaded().learnSession?.attempts).toEqual([]);
  });

  it("resumes the next input format after a reload and retains committed answers", async () => {
    const user = userEvent.setup();
    let view = mount(library());
    await user.click(await screen.findByRole("button", { name: "Start learning" }));
    await correctAnswer(user);
    expect(screen.getByRole("heading", { name: "_____ is the first Greek letter." })).toBeInTheDocument();
    view.unmount();
    view = render(<App />);
    expect(await screen.findByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "_____ is the first Greek letter." })).toBeInTheDocument();
    expect(loaded().learnSession?.attempts).toHaveLength(1);
    await correctAnswer(user);
    expect(screen.getByText("Learning cycle complete")).toBeInTheDocument();
    view.unmount();
    render(<App />);
    expect(await screen.findByText("Learning cycle complete")).toBeInTheDocument();
    expect(loaded().learnSession?.attempts).toHaveLength(2);
  });

  it("blocks incompatible blank-only definition settings and supports typed definitions", async () => {
    const user = userEvent.setup();
    mount(library());
    await user.click(await screen.findByRole("checkbox", { name: "Typing" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Answer with" }), "definition");
    expect(screen.getByRole("alert")).toHaveTextContent("Fill in the blank uses term answers");
    expect(screen.getByRole("button", { name: "Start learning" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Typing" }));
    await user.click(screen.getByRole("button", { name: "Start learning" }));
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    await correctAnswer(user, "First letter");
    expect(loaded().learnSession?.attempts[0]?.type).toBe("written");
  });

  it("opens legacy choice-only saves with typing and retains history", async () => {
    const state = library();
    const old = startLearn(state.cards, sessionKey);
    const history = { id: "old", cardId: "card", type: "multipleChoice", answer: "Alpha", correct: true,
      hinted: false, override: false, at: now.toISOString() };
    const user = userEvent.setup();
    mount({ ...state, learnSession: { ...old, types: ["multipleChoice"], attempts: [history] } as unknown as LearnSession });
    expect(await screen.findByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
    await correctAnswer(user);
    expect(loaded().learnSession?.types).toEqual(["written"]);
    expect(loaded().learnSession?.attempts[0]).toEqual(history);
  });
});

