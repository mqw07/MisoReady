import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import type { MisoPose } from "../components/miso/MisoPortrait.tsx";
import { StudyCompanion } from "../components/miso/StudyCompanion.tsx";
import { ModePicker } from "../components/study/ModePicker.tsx";
import { RecallCard } from "../components/study/RecallCard.tsx";
import { RevealCard } from "../components/study/RevealCard.tsx";
import { SessionSummary } from "../components/study/SessionSummary.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import {
  createStudyEngine,
  applyAiReview,
  currentCard,
  currentPresentation,
  displayedRecallCorrect,
  gradeCard,
  rateCard,
  revealCard,
  restoreStudyEngine,
  type StudyEngine,
} from "../features/study/engine.ts";
import { parseStudyParams, studySessionKey } from "../features/study/params.ts";
import { recallAnswers, recallPrompt } from "../features/study/presentation.ts";
import { sessionProgress } from "../features/study/session.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import type { ReviewRating, StudyMode } from "../types/domain.ts";
import { formatPoints } from "../utils/format.ts";
import { reviewAnswer } from "../services/ai/review.ts";

function studyPose(session: StudyEngine): MisoPose {
  if (session.phase === "front") return "studying";
  if (session.phase === "back") {
    if (session.match?.correct) return "happy";
    if (session.match) return "studying";
    return "idle";
  }
  if (session.phase === "done") {
    const last = session.ratings[session.ratings.length - 1];
    if (last === "again") return "studying";
    if (last === "hard") return "happy";
    return "success";
  }
  return "sleeping";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function StudyPage() {
  usePageTitle("Study");
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards, courses, submitReview, miso, state, clearStudySession } = useLibrary();
  const params = parseStudyParams(searchParams);
  const key = studySessionKey(params);
  const [engine, setEngine] = useState(() => restoreStudyEngine(state, searchParams));
  const [ratingBusy, setRatingBusy] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(() => engine.reviewIds.reduce((sum, id) => sum + (state.reviews.find((review) => review.id === id)?.pointsEarned ?? 0), 0));
  const engineRef = useRef(engine);
  const submitRef = useRef(submitReview);
  const aiRequestRef = useRef<AbortController | null>(null);
  useEffect(() => () => aiRequestRef.current?.abort(), [key]);

  const session = engine.key === key ? engine : createStudyEngine(cards, searchParams);
  if (engine.key !== key) {
    setEngine(session);
    if (ratingBusy) setRatingBusy(false);
    if (sessionPoints !== 0) setSessionPoints(0);
  }

  useLayoutEffect(() => {
    engineRef.current = session;
    submitRef.current = submitReview;
  });

  function commitEngine(next: StudyEngine) {
    engineRef.current = next;
    setEngine(next);
  }

  function handleReveal() {
    commitEngine(revealCard(engineRef.current));
  }

  function handleGrade(input: string) {
    commitEngine(gradeCard(engineRef.current, input));
  }

  async function handleAiReview() {
    const current = engineRef.current;
    const card = currentCard(current);
    if (!card || current.phase !== "back" || !current.answer?.trim() || current.aiPending || current.aiReview || currentPresentation(current) === "reveal") return;
    aiRequestRef.current?.abort();
    const controller = new AbortController();
    aiRequestRef.current = controller;
    const pending = { ...current, aiPending: true, aiError: undefined };
    commitEngine(pending);
    const answers = recallAnswers(card, currentPresentation(current));
    try {
      const verdict = await reviewAnswer({
        prompt: recallPrompt(card, currentPresentation(current)), context: card.description,
        expected: answers[0] ?? card.term, aliases: answers.slice(1), answer: current.answer,
      }, AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]));
      if (engineRef.current === pending && !controller.signal.aborted) commitEngine(applyAiReview(pending, verdict));
    } catch (error) {
      if (engineRef.current === pending && !controller.signal.aborted) commitEngine({
        ...pending, aiPending: false,
        aiError: error instanceof Error ? error.message : "AI review failed. Retry or continue with your rating.",
      });
    }
  }

  function handleRate(rating: ReviewRating) {
    const result = rateCard(engineRef.current, rating);
    if (!result.attempt) return;
    setRatingBusy(true);
    const review = submitRef.current({
      aiReview: result.attempt.aiReview,
      cardId: result.attempt.cardId,
      rating: result.attempt.rating,
      mode: result.attempt.mode,
      reschedule: result.engine.kind === "scheduled",
      userAnswer: result.attempt.userAnswer,
      correct: result.attempt.correct,
      session: { key: result.engine.key, cardIds: result.engine.queue.map((card) => card.id), reviewIds: engineRef.current.reviewIds },
    });
    if (review) {
      commitEngine({ ...result.engine, reviewIds: [...engineRef.current.reviewIds, review.id] });
      setSessionPoints((current) => current + review.pointsEarned);
    }
    setRatingBusy(false);
  }

  function handleMode(mode: StudyMode) {
    const next = new URLSearchParams(searchParams);
    if (mode === "reveal") next.delete("mode");
    else next.set("mode", mode);
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const current = engineRef.current;
      const presentation = currentPresentation(current);
      if (
        presentation === "reveal" &&
        current.phase === "front" &&
        (event.key === " " || event.key === "Enter")
      ) {
        event.preventDefault();
        commitEngine(revealCard(current));
        return;
      }
      if (current.phase !== "back") return;

      const shortcut: Record<string, ReviewRating> = {
        "1": "again",
        a: "again",
        "2": "hard",
        h: "hard",
        "3": "good",
        g: "good",
        "4": "easy",
        e: "easy",
      };
      const rating = shortcut[event.key.toLowerCase()];
      if (!rating) return;
      event.preventDefault();
      handleRate(rating);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const course = params.courseId ? courses.find((item) => item.id === params.courseId) : undefined;
  const card = currentCard(session);
  const presentation = currentPresentation(session);
  const progress = sessionProgress(session.index, session.queue.length);
  const custom = session.kind === "custom";
  const answers = card ? recallAnswers(card, presentation) : [];

  let lede = custom
    ? "Practice only. Ratings are saved. Schedules stay as they are."
    : "Each rating updates the shared study schedule.";
  if (session.phase === "empty") {
    lede =
      params.mode === "fillBlank"
        ? "Fill-in-the-blank needs a stored prompt or the term as its own word in the description."
        : custom
          ? "This set has no cards yet."
          : "Scheduled reviews show up here.";
  } else if (session.phase === "done") {
    lede = custom ? "Practice is saved. Due dates did not change." : "Ratings updated the shared schedule.";
  } else {
    lede = `Card ${progress.current} of ${progress.total}. ${lede}`;
  }

  const emptyTitle =
    params.mode === "fillBlank"
      ? custom
        ? "No fill-in-the-blank cards"
        : "No fill-in-the-blank cards due"
      : custom
        ? "Nothing to practice"
        : "Nothing is due";

  return (
    <>
      <PageHeader
        eyebrow={course?.name ?? (custom ? "Practice" : undefined)}
        title="Study"
        lede={lede}
      />
      <div className="mb-4">
        <ModePicker value={params.mode} onChange={handleMode} />
        <button type="button" className="mt-3 text-sm underline" onClick={() => { clearStudySession(); commitEngine(createStudyEngine(cards, searchParams)); setSessionPoints(0); }}>Start a new session</button>
        <p className="mt-2 text-sm text-muted">Rated cards resume after reload. Practice leaves due dates unchanged. Learning cards may be due again in minutes.</p>
      </div>
      {session.phase === "empty" ? (
        <EmptyState
          art="sleeping"
          title={emptyTitle}
          body={
            params.mode === "fillBlank"
              ? "Add a fill-in-the-blank prompt, or write the term in the description so Miso can blank it."
              : custom
                ? "Add cards to this course or unit, then come back."
                : "New and due cards wait here. Opening Miso does not count as a review."
          }
          action={
            <ButtonLink to="/" variant="secondary">
              Back to Today
            </ButtonLink>
          }
        />
      ) : null}
      {session.phase === "done" ? (
        <SessionSummary
          kind={session.kind}
          ratings={session.ratings}
          pointsEarned={sessionPoints}
          recallCorrect={params.mode === "reveal" ? undefined : session.recallCorrect}
        />
      ) : null}
      {card && (session.phase === "front" || session.phase === "back") ? (
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <ProgressBar
              value={progress.current}
              max={progress.total}
              label={`Card ${progress.current} of ${progress.total}`}
            />
            {presentation === "reveal" ? (
              <RevealCard
                card={card}
                revealed={session.phase === "back"}
                ratingDisabled={ratingBusy}
                onReveal={handleReveal}
                onRate={handleRate}
              />
            ) : (
              <RecallCard
                key={`${session.key}:${card.id}`}
                prompt={recallPrompt(card, presentation)}
                expected={answers[0] ?? card.term}
                aliases={answers.slice(1)}
                match={session.match}
                submittedAnswer={session.answer}
                ratingDisabled={ratingBusy || Boolean(session.aiPending)}
                aiPending={session.aiPending}
                aiReview={session.aiReview}
                aiError={session.aiError}
                onAiReview={handleAiReview}
                onSubmit={handleGrade}
                onRate={handleRate}
              />
            )}
          </div>
          <StudyCompanion
            pose={studyPose(session)}
            equipped={miso.equipped}
            showScore={params.mode !== "reveal"}
            correctCount={displayedRecallCorrect(session)}
          />
        </div>
      ) : null}
      {session.phase !== "empty" && sessionPoints > 0 ? (
        <p className="mt-4 text-sm font-bold text-muted">{formatPoints(sessionPoints)} earned this session.</p>
      ) : null}
    </>
  );
}
