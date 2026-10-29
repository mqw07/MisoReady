import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { createInitialFsrsState, deserializeFsrsCard } from "../services/scheduler/fsrsCard.ts";
import { loadAppState, saveAppState } from "./appDocument.ts";
import { CURRENT_SCHEMA_VERSION, emptyAppState } from "./schema.ts";
import { APP_STATE_STORAGE_KEY, createMemoryStorage } from "./storage.ts";

const now = new Date("2026-10-29T16:00:00.000Z");

function validDocument() {
  const fsrs = createInitialFsrsState(now);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses: [
      {
        id: "course-1",
        name: "CSC209",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    units: [
      {
        id: "unit-1",
        courseId: "course-1",
        name: "Processes",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    cards: [
      {
        id: "card-1",
        courseId: "course-1",
        unitId: "unit-1",
        term: "fork()",
        description: "Creates a new process.",
        acceptedAnswers: ["fork"],
        fsrs,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    reviews: [],
    progress: { points: 0, currentStreak: 0, longestStreak: 0 },
    miso: { ownedCosmeticIds: [], equipped: {} },
  };
}

describe("app document repository", () => {
  it("returns empty state when nothing is stored", () => {
    const storage = createMemoryStorage();
    expect(loadAppState(storage)).toEqual({ status: "empty", state: emptyAppState() });
  });

  it("round-trips a valid document including FSRS timestamps", () => {
    const storage = createMemoryStorage();
    const state = validDocument();
    expect(saveAppState(state, storage)).toEqual({ status: "ok" });

    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.state.cards[0]?.term).toBe("fork()");
    expect(loaded.state.cards[0]?.fsrs.due).toBe(now.toISOString());
    expect(loaded.state.cards[0]?.fsrs.state).toBe(State.New);

    const restored = deserializeFsrsCard(loaded.state.cards[0]!.fsrs);
    expect(restored.due.toISOString()).toBe(now.toISOString());
    expect(restored.state).toBe(State.New);
  });

  it("migrates a v0 document that has no schemaVersion", () => {
    const storage = createMemoryStorage({
      [APP_STATE_STORAGE_KEY]: JSON.stringify({
        courses: [
          {
            id: "course-1",
            name: "CSC209",
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        ],
        units: [],
        cards: [],
      }),
    });

    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.state.courses[0]?.name).toBe("CSC209");
    expect(loaded.state.progress.points).toBe(0);
    expect(loaded.state.miso.ownedCosmeticIds).toEqual([]);
  });

  it("preserves the raw document when JSON is invalid", () => {
    const raw = "{not-json";
    const storage = createMemoryStorage({ [APP_STATE_STORAGE_KEY]: raw });
    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("invalid");
    if (loaded.status !== "invalid") return;
    expect(loaded.state).toEqual(emptyAppState());
    expect(loaded.raw).toBe(raw);
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw);
  });

  it("preserves the raw document when schemaVersion is newer", () => {
    const raw = JSON.stringify({ schemaVersion: 99, courses: [] });
    const storage = createMemoryStorage({ [APP_STATE_STORAGE_KEY]: raw });
    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("invalid");
    if (loaded.status !== "invalid") return;
    expect(loaded.reason).toMatch(/schema 99/i);
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw);
  });

  it("preserves the raw document when a card points at a missing unit", () => {
    const broken = validDocument();
    broken.cards[0]!.unitId = "missing-unit";
    const raw = JSON.stringify(broken);
    const storage = createMemoryStorage({ [APP_STATE_STORAGE_KEY]: raw });
    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("invalid");
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(raw);
  });

  it("does not write during load", () => {
    const raw = JSON.stringify(validDocument());
    const writes: string[] = [];
    const storage = {
      getItem() {
        return raw;
      },
      setItem(_key: string, value: string) {
        writes.push(value);
      },
    };
    const loaded = loadAppState(storage);
    expect(loaded.status).toBe("ok");
    expect(writes).toEqual([]);
  });
});
