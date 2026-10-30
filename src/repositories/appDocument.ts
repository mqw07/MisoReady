import type { AppState } from "../types/domain.ts";
import { assertReferentialIntegrity } from "./integrity.ts";
import type { AppDocumentRepository, LoadResult, SaveResult } from "./interfaces.ts";
import { migrateToCurrent } from "./migrations.ts";
import { emptyAppState, persistedAppStateSchema } from "./schema.ts";
import { APP_STATE_STORAGE_KEY, getStorage, type StoragePort } from "./storage.ts";

function reasonFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Saved data could not be read.";
}

export function loadAppState(storage: StoragePort): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(APP_STATE_STORAGE_KEY);
  } catch (error) {
    return { status: "invalid", state: emptyAppState(), reason: reasonFrom(error), raw: null };
  }

  if (raw === null || raw === "") {
    return { status: "empty", state: emptyAppState() };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateToCurrent(parsed);
    const state = persistedAppStateSchema.parse(migrated);
    assertReferentialIntegrity(state);
    return { status: "ok", state };
  } catch (error) {
    return {
      status: "invalid",
      state: emptyAppState(),
      reason: reasonFrom(error),
      raw,
    };
  }
}

export function saveAppState(state: AppState, storage: StoragePort): SaveResult {
  try {
    storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
    return { status: "ok" };
  } catch (error) {
    return { status: "error", reason: reasonFrom(error) };
  }
}

export function createAppDocumentRepository(
  storage: StoragePort = getStorage(),
): AppDocumentRepository {
  let baseline: string | null | undefined;
  return {
    load: () => {
      try {
        const result = loadAppState(storage);
        if (result.status !== "invalid") baseline = storage.getItem(APP_STATE_STORAGE_KEY);
        return result;
      } catch (error) {
        baseline = undefined;
        return { status: "invalid", state: emptyAppState(), reason: reasonFrom(error), raw: null };
      }
    },
    save: (state) => {
      try {
        if (baseline === undefined || storage.getItem(APP_STATE_STORAGE_KEY) !== baseline) {
          return { status: "error", reason: "Saved data changed in another tab. Reload to use the latest data." };
        }
        const result = saveAppState(state, storage);
        if (result.status === "ok") baseline = JSON.stringify(state);
        return result;
      } catch (error) {
        return { status: "error", reason: reasonFrom(error) };
      }
    },
  };
}
