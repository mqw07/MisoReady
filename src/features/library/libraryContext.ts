import { createContext } from "react";
import type { CosmeticCategory } from "../../services/gamification/catalog.ts";
import type { ShopError } from "../../services/gamification/shop.ts";
import type {
  AppState,
  CardContent,
  Course,
  Flashcard,
  MisoState,
  ReviewRating,
  ReviewRecord,
  StudyMode,
  Unit,
} from "../../types/domain.ts";

export interface LibraryValue {
  hasUnsavedChanges: boolean;
  navigationRisks: string[];
  setNavigationRisk: (id: string, reason: string | null) => void;
  persistBlocked: boolean;
  persistError: string | null;
  retrySave: () => void;
  saveLearnSession: (session: AppState["learnSession"]) => void;
  clearStudySession: () => void;
  writeReady: boolean;
  state: AppState;
  courses: Course[];
  units: Unit[];
  cards: Flashcard[];
  createCourse: (name: string) => Course;
  renameCourse: (courseId: string, name: string) => Course | null;
  deleteCourse: (courseId: string) => boolean;
  createUnit: (courseId: string, name: string) => Unit | null;
  renameUnit: (unitId: string, name: string) => Unit | null;
  deleteUnit: (unitId: string) => boolean;
  createCard: (unitId: string, content: CardContent) => Flashcard | null;
  createCards: (unitId: string, contents: CardContent[]) => Flashcard[] | null;
  updateCard: (cardId: string, content: CardContent) => Flashcard | null;
  deleteCard: (cardId: string) => boolean;
  duplicateCard: (cardId: string) => Flashcard | null;
  moveCard: (cardId: string, unitId: string) => Flashcard | null;
  miso: MisoState;
  buyCosmetic: (cosmeticId: string) => ShopError | null;
  equipCosmetic: (cosmeticId: string) => ShopError | null;
  unequipCosmetic: (category: CosmeticCategory) => void;
  submitReview: (input: {
    aiReview?: ReviewRecord["aiReview"];
    cardId: string;
    rating: ReviewRating;
    mode: StudyMode;
    reschedule: boolean;
    session?: { key: string; cardIds: string[]; reviewIds: string[] };
    userAnswer?: string;
    correct?: boolean;
  }) => ReviewRecord | null;
}

export const LibraryContext = createContext<LibraryValue | null>(null);
