import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createAppDocumentRepository } from "../../repositories/appDocument.ts";
import { getStorage } from "../../repositories/storage.ts";
import type { CosmeticCategory } from "../../services/gamification/catalog.ts";
import {
  equipCosmetic as wearCosmetic,
  purchaseCosmetic,
  unequipCategory,
} from "../../services/gamification/shop.ts";
import type { CardContent, ReviewRating, ReviewRecord, StudyMode } from "../../types/domain.ts";
import { LibraryContext } from "./libraryContext.ts";
import {
  deleteCard as removeCard,
  deleteCourse as removeCourse,
  deleteUnit as removeUnit,
  duplicateCard as copyCard,
  insertCard,
  insertCards,
  insertCourse,
  insertUnit,
  moveCard as relocateCard,
  recordReview,
  renameCourse as renameCourseRecord,
  renameUnit as renameUnitRecord,
  updateCard as editCard,
} from "./mutations.ts";

export function LibraryProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createAppDocumentRepository(getStorage()), []);
  const loaded = useMemo(() => repository.load(), [repository]);
  const [persistBlocked, setPersistBlocked] = useState(loaded.status === "invalid");
  const [state, setState] = useState(loaded.state);
  const [persistError, setPersistError] = useState<string | null>(
    loaded.status === "invalid" ? loaded.reason : null,
  );
  const stateRef = useRef(loaded.state);
  const [writeReady, setWriteReady] = useState(false);
  const ownsLock = useRef(false);
  const dirty = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [navigationRiskMap, setNavigationRiskMap] = useState<Record<string, string>>({});
  const hasTransientWork = useRef(false);
  const setNavigationRisk = useCallback((id: string, reason: string | null) => {
    setNavigationRiskMap(current => {
      const next = { ...current };
      if (reason) next[id] = reason;
      else delete next[id];
      hasTransientWork.current = Object.keys(next).length > 0;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!navigator.locks) {
      queueMicrotask(() => setPersistError("This browser cannot safely coordinate saved data. Open Miso in a current browser using HTTPS."));
      return;
    }
    const controller = new AbortController();
    let release: (() => void) | undefined;
    // A single writer prevents the read/check/write race across browser tabs.
    void navigator.locks.request("miso-library-writer", { signal: controller.signal }, async () => {
      if (controller.signal.aborted) return;
      const latest = repository.load();
      setPersistBlocked(latest.status === "invalid");
      if (latest.status === "invalid") {
        setPersistError(latest.reason);
      }
      stateRef.current = latest.state;
      setState(latest.state);
      ownsLock.current = true;
      setWriteReady(true);
      await new Promise<void>((resolve) => { release = resolve; });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setPersistError(String(error));
    });
    return () => {
      ownsLock.current = false;
      controller.abort();
      release?.();
    };
  }, [repository]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current || hasTransientWork.current) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const commit = useCallback(
    (next: typeof state) => {
      if (!ownsLock.current) return;
      stateRef.current = next;
      setState(next);
      if (persistBlocked) return;
      const result = repository.save(next);
      dirty.current = result.status === "error";
      setHasUnsavedChanges(dirty.current);
      setPersistError(result.status === "error" ? result.reason : null);
    },
    [persistBlocked, repository],
  );
  const retrySave = useCallback(() => commit(stateRef.current), [commit]);
  const saveLearnSession = useCallback((session: typeof state.learnSession) => { if (!persistBlocked) commit({ ...stateRef.current, learnSession: session }); }, [commit, persistBlocked]);
  const clearStudySession = useCallback(() => commit({ ...stateRef.current, studySession: undefined }), [commit]);

  const createCourse = useCallback(
    (name: string) => {
      const result = insertCourse(stateRef.current, name);
      commit(result.state);
      return result.course;
    },
    [commit],
  );

  const renameCourse = useCallback(
    (courseId: string, name: string) => {
      const result = renameCourseRecord(stateRef.current, courseId, name);
      if (!result) return null;
      commit(result.state);
      return result.course;
    },
    [commit],
  );

  const deleteCourse = useCallback(
    (courseId: string) => {
      const result = removeCourse(stateRef.current, courseId);
      if (result.deleted) commit(result.state);
      return result.deleted;
    },
    [commit],
  );

  const createUnit = useCallback(
    (courseId: string, name: string) => {
      const result = insertUnit(stateRef.current, courseId, name);
      if (!result) return null;
      commit(result.state);
      return result.unit;
    },
    [commit],
  );

  const renameUnit = useCallback(
    (unitId: string, name: string) => {
      const result = renameUnitRecord(stateRef.current, unitId, name);
      if (!result) return null;
      commit(result.state);
      return result.unit;
    },
    [commit],
  );

  const deleteUnit = useCallback(
    (unitId: string) => {
      const result = removeUnit(stateRef.current, unitId);
      if (result.deleted) commit(result.state);
      return result.deleted;
    },
    [commit],
  );

  const createCard = useCallback(
    (unitId: string, content: CardContent) => {
      const result = insertCard(stateRef.current, unitId, content);
      if (!result) return null;
      commit(result.state);
      return result.card;
    },
    [commit],
  );

  const createCards = useCallback(
    (unitId: string, contents: CardContent[]) => {
      const result = insertCards(stateRef.current, unitId, contents);
      if (!result) return null;
      commit(result.state);
      return result.cards;
    },
    [commit],
  );

  const updateCard = useCallback(
    (cardId: string, content: CardContent) => {
      const result = editCard(stateRef.current, cardId, content);
      if (!result) return null;
      commit(result.state);
      return result.card;
    },
    [commit],
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      const result = removeCard(stateRef.current, cardId);
      if (result.deleted) commit(result.state);
      return result.deleted;
    },
    [commit],
  );

  const duplicateCard = useCallback(
    (cardId: string) => {
      const result = copyCard(stateRef.current, cardId);
      if (!result) return null;
      commit(result.state);
      return result.card;
    },
    [commit],
  );

  const moveCard = useCallback(
    (cardId: string, unitId: string) => {
      const result = relocateCard(stateRef.current, cardId, unitId);
      if (!result) return null;
      commit(result.state);
      return result.card;
    },
    [commit],
  );

  const buyCosmetic = useCallback(
    (cosmeticId: string) => {
      const result = purchaseCosmetic(stateRef.current, cosmeticId);
      if ("error" in result) return result.error;
      commit(result.state);
      return null;
    },
    [commit],
  );

  const equipCosmetic = useCallback(
    (cosmeticId: string) => {
      const result = wearCosmetic(stateRef.current, cosmeticId);
      if ("error" in result) return result.error;
      commit(result.state);
      return null;
    },
    [commit],
  );

  const unequipCosmetic = useCallback(
    (category: CosmeticCategory) => {
      commit(unequipCategory(stateRef.current, category).state);
    },
    [commit],
  );

  const submitReview = useCallback(
    (input: {
      aiReview?: ReviewRecord["aiReview"];
      cardId: string;
      rating: ReviewRating;
      mode: StudyMode;
      reschedule: boolean;
      session?: { key: string; cardIds: string[]; reviewIds: string[] };
      userAnswer?: string;
      correct?: boolean;
    }) => {
      if (!ownsLock.current || persistBlocked) return null;
      const result = recordReview(stateRef.current, input);
      if (!result) return null;
      commit(result.state);
      return result.review;
    },
    [commit, persistBlocked],
  );

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      navigationRisks: Object.values(navigationRiskMap),
      setNavigationRisk,
      writeReady,
      retrySave,
      clearStudySession,
      saveLearnSession,
      persistBlocked,
      persistError,
      state,
      courses: state.courses,
      units: state.units,
      cards: state.cards,
      createCourse,
      renameCourse,
      deleteCourse,
      createUnit,
      renameUnit,
      deleteUnit,
      createCard,
      createCards,
      updateCard,
      deleteCard,
      duplicateCard,
      moveCard,
      miso: state.miso,
      buyCosmetic,
      equipCosmetic,
      unequipCosmetic,
      submitReview,
    }),
    [
      hasUnsavedChanges,
      navigationRiskMap,
      setNavigationRisk,
      writeReady,
      retrySave,
      clearStudySession,
      saveLearnSession,
      persistBlocked,
      persistError,
      state,
      createCourse,
      renameCourse,
      deleteCourse,
      createUnit,
      renameUnit,
      deleteUnit,
      createCard,
      createCards,
      updateCard,
      deleteCard,
      duplicateCard,
      moveCard,
      buyCosmetic,
      equipCosmetic,
      unequipCosmetic,
      submitReview,
    ],
  );

  return <LibraryContext value={value}>{children}</LibraryContext>;
}
