import type {
  AppState,
  Course,
  Flashcard,
  MisoState,
  ReviewRecord,
  Unit,
  UserProgress,
} from "../types/domain.ts";

export type LoadResult =
  | { status: "ok"; state: AppState }
  | { status: "empty"; state: AppState }
  | { status: "invalid"; state: AppState; reason: string; raw: string | null };

export type SaveResult = { status: "ok" } | { status: "error"; reason: string };

/** Single persisted document. Collection repositories share this boundary. */
export interface AppDocumentRepository {
  load(): LoadResult;
  save(state: AppState): SaveResult;
}

export interface CourseRepository {
  list(state: AppState): Course[];
  get(state: AppState, id: string): Course | undefined;
}

export interface UnitRepository {
  list(state: AppState): Unit[];
  listByCourse(state: AppState, courseId: string): Unit[];
  get(state: AppState, id: string): Unit | undefined;
}

export interface CardRepository {
  list(state: AppState): Flashcard[];
  listByCourse(state: AppState, courseId: string): Flashcard[];
  listByUnit(state: AppState, unitId: string): Flashcard[];
  get(state: AppState, id: string): Flashcard | undefined;
}

export interface ReviewRepository {
  list(state: AppState): ReviewRecord[];
}

export interface ProgressRepository {
  get(state: AppState): UserProgress;
}

export interface MisoRepository {
  get(state: AppState): MisoState;
}
