export type ReviewRating = "again" | "hard" | "good" | "easy";
export type StudyMode = "reveal" | "typed" | "fillBlank" | "mixed";

export interface Course {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  courseId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FillBlank {
  prompt: string;
  acceptedAnswers: string[];
}

/**
 * Scheduler fields stored as JSON-safe values.
 * Dates are ISO-8601 strings; `state` is the ts-fsrs numeric State.
 */
export interface FsrsCardState {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface Flashcard {
  id: string;
  courseId: string;
  unitId: string;
  term: string;
  description: string;
  acceptedAnswers: string[];
  fillBlank?: FillBlank;
  fsrs: FsrsCardState;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  cardId: string;
  reviewedAt: string;
  mode: StudyMode;
  rating: ReviewRating;
  userAnswer?: string;
  pointsEarned: number;
  eligible?: boolean;
  correct?: boolean;
}

export interface UserProgress {
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedStudyDate?: string;
  dueSnapshotDate?: string;
  dueSnapshotCount?: number;
}

export interface MisoState {
  ownedCosmeticIds: string[];
  equipped: Record<string, string>;
}

export interface AppState {
  schemaVersion: number;
  courses: Course[];
  units: Unit[];
  cards: Flashcard[];
  reviews: ReviewRecord[];
  progress: UserProgress;
  miso: MisoState;
}

export interface CardContent {
  term: string;
  description: string;
  acceptedAnswers: string[];
  fillBlank?: FillBlank;
}
