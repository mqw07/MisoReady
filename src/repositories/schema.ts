import { z } from "zod";
import type { AppState } from "../types/domain.ts";

export const CURRENT_SCHEMA_VERSION = 1;

const isoTimestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)), {
  message: "Expected an ISO timestamp.",
});

const fsrsCardStateSchema = z.object({
  due: isoTimestamp,
  stability: z.number().finite(),
  difficulty: z.number().finite(),
  scheduled_days: z.number().finite(),
  learning_steps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.number().int().min(0).max(3),
  last_review: isoTimestamp.optional(),
});

const fillBlankSchema = z.object({
  prompt: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
});

const courseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

const unitSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

const flashcardSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  unitId: z.string().min(1),
  term: z.string().min(1),
  description: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)),
  fillBlank: fillBlankSchema.optional(),
  fsrs: fsrsCardStateSchema,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

const reviewRecordSchema = z.object({
  aiReview: z.object({ correct: z.boolean(), explanation: z.string() }).optional(),
  id: z.string().min(1),
  cardId: z.string().min(1),
  reviewedAt: isoTimestamp,
  mode: z.enum(["reveal", "typed", "fillBlank", "mixed"]),
  rating: z.enum(["again", "hard", "good", "easy"]),
  userAnswer: z.string().optional(),
  pointsEarned: z.number().int().nonnegative(),
  eligible: z.boolean().optional(),
  correct: z.boolean().optional(),
});

const userProgressSchema = z.object({
  points: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastQualifiedStudyDate: z.string().optional(),
  dueSnapshotDate: z.string().optional(),
  dueSnapshotCount: z.number().int().nonnegative().optional(),
});

const misoStateSchema = z.object({
  ownedCosmeticIds: z.array(z.string().min(1)),
  equipped: z.record(z.string(), z.string()),
});

export const persistedAppStateSchema = z.object({
  studySession: z.object({ key: z.string(), cardIds: z.array(z.string()), reviewIds: z.array(z.string()) }).optional().catch(undefined),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  courses: z.array(courseSchema),
  units: z.array(unitSchema),
  cards: z.array(flashcardSchema),
  reviews: z.array(reviewRecordSchema),
  progress: userProgressSchema,
  miso: misoStateSchema,
});

export function emptyProgress(): AppState["progress"] {
  return {
    points: 0,
    currentStreak: 0,
    longestStreak: 0,
  };
}

export function emptyMiso(): AppState["miso"] {
  return {
    ownedCosmeticIds: [],
    equipped: {},
  };
}

export function emptyAppState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses: [],
    units: [],
    cards: [],
    reviews: [],
    progress: emptyProgress(),
    miso: emptyMiso(),
  };
}
